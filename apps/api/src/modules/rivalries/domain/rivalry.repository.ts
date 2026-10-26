import { RivalryEntity } from './rivalry.entity';

export interface RivalryRepository {
  findById(id: string): Promise<RivalryEntity | null>;
  save(rivalry: RivalryEntity): Promise<RivalryEntity>;
}
