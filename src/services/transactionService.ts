import dataSource from '../data-source';
import { Transaction } from '../entities/transaction';

export const logTransaction = async (transactionData: Partial<Transaction>) => {
  const transactionRepository = dataSource.getRepository(Transaction);
  const transaction = transactionRepository.create(transactionData);
  await transactionRepository.save(transaction);
  return transaction;
};
