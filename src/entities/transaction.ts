import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  blockNumber!: number;

  @Column()
  positionInBlock!: number;

  @Column()
  timestamp!: Date;

  @Column()
  transactionBytes!: string;

  @Column()
  sender!: string;

  @Column()
  recipient!: string;

  @Column({ type: 'float' })
  amount!: number;

  @Column()
  currency!: string;

  @Column()
  status!: string;

  @Column()
  chain_name!: string;

  @Column()
  transaction_hash!: string;
}
