import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
    IsArray,
    ArrayMinSize,
    ArrayMaxSize,
    IsIn,
    ValidateIf,
    ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderPartDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsString()
    @IsOptional()
    video?: string;
}


export class CreateOrderDto {
    // Top-level fields from Frontend Store
    @IsString()
    @IsIn(['single', 'multiple'])
    requestType: 'single' | 'multiple';

    @IsString()
    @IsOptional()
    shippingType?: string;

    // Vehicle Details (required)
    @IsString()
    @IsNotEmpty()
    vehicleMake: string;

    @IsString()
    @IsNotEmpty()
    vehicleModel: string;

    @IsNumber()
    @Min(1900)
    vehicleYear: number;

    @IsString()
    @IsOptional()
    vin?: string;

    @IsString()
    @IsOptional()
    vinImage?: string;

    // Part Details - Multi-part support
    @IsArray()
    @ValidateNested({ each: true })
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @Type(() => CreateOrderPartDto)
    parts: CreateOrderPartDto[];

    // Legacy fields for backward compatibility (Optional now)
    @IsString()
    @IsOptional()
    partName?: string;

    @IsString()
    @IsOptional()
    partDescription?: string;

    @IsOptional()
    partImages?: string[];

    // Preferences
    @IsString()
    @IsOptional()
    conditionPref?: string; // 'new' | 'used'

    @IsBoolean()
    @IsOptional()
    warrantyPreferred?: boolean;

    /** Client UUID for create idempotency (optional for legacy clients) */
    @IsOptional()
    @IsUUID('4')
    @MaxLength(64)
    clientRequestId?: string;

    /**
     * Reorder path: recreate parts that received no offers from an existing multi order.
     * Both fields must be provided together; part count must match `parts.length`.
     */
    @ValidateIf((o: CreateOrderDto) => o.reorderPartIds != null && o.reorderPartIds.length > 0)
    @IsUUID('4')
    @IsOptional()
    reorderFromOrderId?: string;

    @ValidateIf((o: CreateOrderDto) => !!o.reorderFromOrderId)
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    @IsOptional()
    reorderPartIds?: string[];
}
