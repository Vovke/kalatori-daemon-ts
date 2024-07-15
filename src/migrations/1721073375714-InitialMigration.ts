import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1721073375714 implements MigrationInterface {
    name = 'InitialMigration1721073375714'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "order" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "orderId" varchar NOT NULL, "amount" float, "repaidAmount" float NOT NULL DEFAULT (0), "currency" varchar, "callback" varchar, "paymentStatus" varchar NOT NULL, "withdrawalStatus" varchar NOT NULL, "paymentAccount" varchar NOT NULL, "recipient" varchar NOT NULL, "paymentPage" varchar, "redirectUrl" varchar, "message" varchar)`);
        await queryRunner.query(`CREATE TABLE "transaction" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "blockNumber" integer NOT NULL, "positionInBlock" integer NOT NULL, "timestamp" datetime NOT NULL, "transactionBytes" varchar NOT NULL, "sender" varchar NOT NULL, "recipient" varchar NOT NULL, "amount" float NOT NULL, "currency" varchar NOT NULL, "status" varchar NOT NULL, "chain_name" varchar NOT NULL, "transaction_hash" varchar NOT NULL)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP TABLE "order"`);
    }

}
