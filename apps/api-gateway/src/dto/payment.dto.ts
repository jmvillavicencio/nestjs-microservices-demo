import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 99.99, description: 'Payment amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Currency code', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'Premium subscription', description: 'Payment description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'credit_card', description: 'Payment method' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}

export class ProcessRefundDto {
  @ApiProperty({ example: 99.99, description: 'Refund amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'Customer request', description: 'Reason for refund' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class PaymentResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: string;

  @ApiProperty({ example: 99.99 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'completed', enum: ['pending', 'completed', 'failed', 'refunded'] })
  status: string;

  @ApiProperty({ example: 'Premium subscription' })
  description: string;

  @ApiProperty({ example: 'credit_card' })
  paymentMethod: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt: string;
}

export class PaymentsListResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] })
  payments: PaymentResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;
}
