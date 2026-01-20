import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { UserService } from './user.service';
import { RabbitMQService } from './rabbitmq.service';
import { PrismaService } from '@app/prisma';
import { USER_EVENTS } from '@app/common';

describe('UserService', () => {
  let service: UserService;
  let prismaService: PrismaService;
  let rabbitMQService: RabbitMQService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRabbitMQService = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitMQService, useValue: mockRabbitMQService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserRequest = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.createUser(createUserRequest);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        USER_EVENTS.USER_CREATED,
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        }),
      );
    });

    it('should throw RpcException if user already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.createUser(createUserRequest)).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser({ id: 'user-123' });

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw RpcException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUser({ id: 'non-existent' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('getUsers', () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'test1@example.com',
        name: 'User 1',
        password: 'hash1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-2',
        email: 'test2@example.com',
        name: 'User 2',
        password: 'hash2',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(2);

      const result = await service.getUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should use default pagination values', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.user.count.mockResolvedValue(0);

      await service.getUsers({});

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('updateUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update a user successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.updateUser({
        id: 'user-123',
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        USER_EVENTS.USER_UPDATED,
        expect.any(Object),
      );
    });

    it('should throw RpcException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser({ id: 'non-existent', name: 'New Name' }),
      ).rejects.toThrow(RpcException);
    });

    it('should throw RpcException if email already in use', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for finding user to update
        .mockResolvedValueOnce({ ...mockUser, id: 'other-user' }); // Second call for email check

      await expect(
        service.updateUser({ id: 'user-123', email: 'taken@example.com' }),
      ).rejects.toThrow(RpcException);
    });
  });

  describe('deleteUser', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed_password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);
      mockRabbitMQService.emit.mockResolvedValue(undefined);

      const result = await service.deleteUser({ id: 'user-123' });

      expect(result.success).toBe(true);
      expect(mockRabbitMQService.emit).toHaveBeenCalledWith(
        USER_EVENTS.USER_DELETED,
        expect.objectContaining({ id: 'user-123' }),
      );
    });

    it('should throw RpcException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser({ id: 'non-existent' })).rejects.toThrow(
        RpcException,
      );
    });
  });
});
