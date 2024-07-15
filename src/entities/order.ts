import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  TimedOut = 'timed_out'
}
// enums.ts
export enum WithdrawalStatus {
  Waiting = 'waiting',
  Failed = 'failed',
  Completed = 'completed',
  None = 'none'
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  orderId!: string;

  @Column({ type: 'float', nullable: true })
  amount?: number;

  @Column({ type: 'float', default: 0 })
  repaidAmount?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  callback?: string;

  @Column({ type: 'text', default: PaymentStatus.Pending })
  paymentStatus!: PaymentStatus;

  @Column({ type: 'text', default: WithdrawalStatus.Waiting })
  withdrawalStatus!: WithdrawalStatus;

  @Column()
  paymentAccount!: string;

  @Column()
  recipient!: string;

  @Column({ nullable: true })
  paymentPage?: string;

  @Column({ nullable: true })
  redirectUrl?: string;

  @Column({ nullable: true })
  message?: string;
}
