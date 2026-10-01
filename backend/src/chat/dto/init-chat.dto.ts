import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class InitChatDto {
    @IsUUID()
    @IsNotEmpty()
    orderId: string;

    @IsUUID()
    @IsNotEmpty()
    vendorId: string;

    @IsUUID()
    @IsOptional()
    orderPartId?: string;
}
