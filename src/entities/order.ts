import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  orderId!: string;

  @Column({ type: 'float', nullable: true })
  amount?: number;

  @Column({ nullable: true })
  currency?: string;

  @Column({ nullable: true })
  callback?: string;

  @Column()
  paymentStatus!: string;

  @Column()
  withdrawalStatus!: string;

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
