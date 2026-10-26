import { Controller } from '@nestjs/common';

/** Keep HTTP handlers thin: validate, delegate to a use-case, return a response. */
@Controller('rivalries')
export class RivalriesController {}
