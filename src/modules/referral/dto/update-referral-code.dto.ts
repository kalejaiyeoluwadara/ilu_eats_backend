import { PartialType } from '@nestjs/mapped-types';
import { CreateReferralCodeDto } from './create-referral-code.dto';

export class UpdateReferralCodeDto extends PartialType(CreateReferralCodeDto) {}
