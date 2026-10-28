import { RivalryStatus } from "./rivalry-status.enum";

export interface RivalryEntity {
  id: string;
  status: RivalryStatus;
}
