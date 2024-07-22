import * as dotenvFlow from 'dotenv-flow';
import * as path from 'path';
import * as fs from 'fs';
import * as Joi from 'joi';

dotenvFlow.config({
  path: path.resolve(__dirname, '../../'),
});

interface ChainConfig {
  name: string;
  native_token: string;
  decimals: number;
  endpoints: string[];
  assets?: {
    name: string;
    id: number;
  }[];
}

interface AppConfig {
  port: number;
  databaseUrl: string;
  logLevel: string;
  supportedCurrencies: Record<string, { decimals: number }>;
  chains: ChainConfig[];
  kalatori: {
    seed: string;
    chainName: string;
    decimals: number;
    recipient: string;
    remark: string;
  };
  connectedRpcs: string[];
  serverStatus: string;
  version: string;
  instanceId: string;
  debug: boolean;
  kalatoriRemark: string;
  blockchain: {
    maxRetries: number;
    retryDelay: number;
  };
}

class Config {
  private static instance: Config;
  public config: AppConfig;

  private constructor() {
    const defaultConfigPath = path.resolve(__dirname, '../../config/default.json');
    const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

    const envConfigPath = path.resolve(__dirname, `../../config/${process.env.NODE_ENV || 'development'}.json`);
    const envConfig = fs.existsSync(envConfigPath) ? JSON.parse(fs.readFileSync(envConfigPath, 'utf-8')) : {};

    const chainConfigPath = path.resolve(__dirname, '../../config/chains.json');
    const chainConfig = fs.existsSync(chainConfigPath) ? JSON.parse(fs.readFileSync(chainConfigPath, 'utf-8')) : {};

    const mergedConfig = {
      ...defaultConfig,
      ...envConfig,
      chains: chainConfig.chains,
      kalatori: {
        seed: process.env.KALATORI_SEED || "",
        chainName: process.env.KALATORI_CHAIN_NAME || "polkadot",
        decimals: parseInt(process.env.KALATORI_DECIMALS || "10", 10),
        recipient: process.env.KALATORI_RECIPIENT || "",
        remark: process.env.KALATORI_REMARK || "",
      },
      connectedRpcs: [],
      serverStatus: 'unknown',
      version: '1.0.0',
      instanceId: 'instance-1',
      debug: process.env.NODE_ENV !== 'production',
      kalatoriRemark: process.env.KALATORI_REMARK || ""
    };

    const schema = Joi.object({
      port: Joi.number().default(3000),
      databaseUrl: Joi.string().required(),
      logLevel: Joi.string().default('info'),
      supportedCurrencies: Joi.object().pattern(
        Joi.string(),
        Joi.object({
          decimals: Joi.number().required(),
        })
      ),
      chains: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          native_token: Joi.string().required(),
          decimals: Joi.number().required(),
          endpoints: Joi.array().items(Joi.string()).required(),
          assets: Joi.array().items(
            Joi.object({
              name: Joi.string().required(),
              id: Joi.number().required(),
            })
          ).optional(),
        })
      ).required(),
      kalatori: Joi.object({
        seed: Joi.string().required(),
        chainName: Joi.string().required(),
        decimals: Joi.number().required(),
        recipient: Joi.string().required(),
        remark: Joi.string().required(),
      }).required(),
      connectedRpcs: Joi.array().items(Joi.string()).default([]),
      serverStatus: Joi.string().default('unknown'),
      version: Joi.string().default('1.0.0'),
      instanceId: Joi.string().default('instance-1'),
      debug: Joi.boolean().default(false),
      kalatoriRemark: Joi.string().default(""),
      blockchain: Joi.object({
        maxRetries: Joi.number().default(5),
        retryDelay: Joi.number().default(1000)
      }).required()
    });

    const { error, value } = schema.validate(mergedConfig, { allowUnknown: true, stripUnknown: true });
    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }

    this.config = value;
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }

    return Config.instance;
  }

  public update(newConfig: Partial<AppConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

export default Config;

export const updateConfig = (newConfig: Partial<AppConfig>) => {
  const configInstance = Config.getInstance();
  configInstance.update(newConfig);
};
