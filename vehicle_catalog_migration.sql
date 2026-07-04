-- Migration: Create Vehicle Catalog Tables
CREATE TABLE IF NOT EXISTS vehicle_makes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    name_ar TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make_id UUID NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(make_id, name)
);

-- Seed Data

DO $$
DECLARE
  make_Toyota_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Toyota', 'تويوتا') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Toyota_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Land Cruiser', 'لاند كروزر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Camry', 'كامري') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Corolla', 'كورولا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Hilux', 'هايلكس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Prado', 'برادو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'RAV4', 'راف 4') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Fortuner', 'فورتشنر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Yaris', 'ياريس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Avalon', 'أفالون') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Supra', 'سوبرا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Highlander', 'هايلاندر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Innova', 'إنوفا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'C-HR', 'سي اتش آر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Corolla Cross', 'كورولا كروس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'FJ Cruiser', 'إف جي كروزر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Toyota_id, 'Sequoia', 'سيكويا') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Nissan_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Nissan', 'نيسان') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Nissan_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Patrol', 'باترول') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Sunny', 'صني') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'X-Trail', 'إكس تريل') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Juke', 'جوك') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Maxima', 'ماكسيما') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Sentra', 'سنترا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Altima', 'ألتيما') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Kicks', 'كيكس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Pathfinder', 'باثفايندر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Navara', 'نافارا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'GT-R', 'جي تي آر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Z', 'زد') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Nissan_id, 'Ariya', 'أريا') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Hyundai_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Hyundai', 'هيونداي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Hyundai_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Sonata', 'سوناتا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Elantra', 'النترا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Tucson', 'توسان') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Santa Fe', 'سانتافي') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Accent', 'أكسنت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Creta', 'كريتا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Kona', 'كونا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Azera', 'أزيرا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Veloster', 'فيلوستر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Venue', 'فيني') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Palisade', 'باليسيد') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Hyundai_id, 'Staria', 'ستاريا') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Kia_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Kia', 'كيا') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Kia_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Sorento', 'سورينتو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Sportage', 'سبورتاج') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Cerato', 'سيراتو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Optima/K5', 'أوبتيما / كي 5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Rio', 'ريو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Picanto', 'بيكانتو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Seltos', 'سيلتوس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Telluride', 'تيلورايد') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Stinger', 'ستينجر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Carnival', 'كرنفال') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Soul', 'سول') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Kia_id, 'Sonet', 'سونيت') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Mercedes_Benz_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Mercedes-Benz', 'مرسيدس-بنز') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Mercedes_Benz_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'C-Class', 'فئة C') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'E-Class', 'فئة E') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'S-Class', 'فئة S') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'G-Class', 'فئة G') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'A-Class', 'فئة A') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'CLA', 'CLA') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'CLS', 'CLS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'GLA', 'GLA') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'GLC', 'GLC') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'GLE', 'GLE') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'GLS', 'GLS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'V-Class', 'فئة V') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mercedes_Benz_id, 'EQS', 'EQS') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_BMW_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('BMW', 'بي إم دبليو') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_BMW_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, '3 Series', 'الفئة الثالثة') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, '5 Series', 'الفئة الخامسة') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, '7 Series', 'الفئة السابعة') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'X1', 'X1') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'X3', 'X3') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'X5', 'X5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'X6', 'X6') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'X7', 'X7') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, '4 Series', 'الفئة الرابعة') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, '8 Series', 'الفئة الثامنة') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'M3', 'M3') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'M4', 'M4') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'M5', 'M5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_BMW_id, 'iX', 'iX') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Lexus_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Lexus', 'لكزس') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Lexus_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'LX', 'LX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'RX', 'RX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'ES', 'ES') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'IS', 'IS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'LS', 'LS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'NX', 'NX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'GX', 'GX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'UX', 'UX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'LC', 'LC') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Lexus_id, 'RC', 'RC') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Honda_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Honda', 'هوندا') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Honda_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'Civic', 'سيفيك') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'Accord', 'أكورد') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'CR-V', 'CR-V') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'Pilot', 'بايلوت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'City', 'سيتي') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'HR-V', 'HR-V') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'Odyssey', 'أوديسي') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Honda_id, 'Jazz', 'جاز') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Chevrolet_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Chevrolet', 'شفروليه') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Chevrolet_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Tahoe', 'تاهو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Captiva', 'كابتيفا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Silverado', 'سيلفرادو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Suburban', 'سوبربان') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Malibu', 'ماليبو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Camaro', 'كامارو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Corvette', 'كورفيت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Blazer', 'بليزر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Traverse', 'ترافرس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Chevrolet_id, 'Groove', 'جروف') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Ford_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Ford', 'فورد') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Ford_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Explorer', 'إكسبلورر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Escape', 'إسكيب') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Fusion', 'فيوجن') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'F-150', 'F-150') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Mustang', 'موستانج') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Expedition', 'إكسبيديشن') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Edge', 'إيدج') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Taurus', 'توروس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Ranger', 'رينجر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Bronco', 'برونكو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Ford_id, 'Territory', 'تيريتوري') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_GMC_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('GMC', 'جي إم سي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_GMC_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_GMC_id, 'Yukon', 'يوكن') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_GMC_id, 'Sierra', 'سييرا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_GMC_id, 'Acadia', 'أكاديا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_GMC_id, 'Terrain', 'تيرين') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Mazda_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Mazda', 'مازدا') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Mazda_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'Mazda 6', 'مازدا 6') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'CX-9', 'CX-9') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'CX-5', 'CX-5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'Mazda 3', 'مازدا 3') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'CX-30', 'CX-30') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mazda_id, 'CX-60', 'CX-60') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Mitsubishi_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Mitsubishi', 'ميتسوبيشي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Mitsubishi_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Pajero', 'باجيرو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Outlander', 'أوتلاندر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'L200', 'L200') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Montero Sport', 'مونتيرو سبورت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Eclipse Cross', 'إكليبس كروس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'ASX', 'ASX') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Attrage', 'أتراج') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Mitsubishi_id, 'Space Star', 'سبيس ستار') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Jeep_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Jeep', 'جيب') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Jeep_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Jeep_id, 'Grand Cherokee', 'جراند شيروكي') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Jeep_id, 'Wrangler', 'رانجلر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Jeep_id, 'Compass', 'كومباس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Jeep_id, 'Gladiator', 'جلاديتور') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Dodge_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Dodge', 'دودج') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Dodge_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Dodge_id, 'Charger', 'تشارجر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Dodge_id, 'Challenger', 'تشالنجر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Dodge_id, 'Durango', 'دورانجو') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Cadillac_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Cadillac', 'كاديلاك') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Cadillac_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'Escalade', 'إسكاليد') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'CT4', 'CT4') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'CT5', 'CT5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'XT4', 'XT4') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'XT5', 'XT5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Cadillac_id, 'XT6', 'XT6') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Genesis_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Genesis', 'جينيسيس') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Genesis_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Genesis_id, 'G70', 'G70') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Genesis_id, 'G80', 'G80') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Genesis_id, 'G90', 'G90') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Genesis_id, 'GV70', 'GV70') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Genesis_id, 'GV80', 'GV80') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Land_Rover_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Land Rover', 'لاند روفر') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Land_Rover_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Range Rover', 'رينج روفر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Range Rover Sport', 'رينج روفر سبورت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Defender', 'ديفندر') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Evoque', 'إيفوك') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Velar', 'فيلار') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Land_Rover_id, 'Discovery', 'ديسكفري') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Volkswagen_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Volkswagen', 'فولكس فاجن') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Volkswagen_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'Golf', 'جولف') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'Tiguan', 'تيجوان') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'Touareg', 'طوارق') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'Passat', 'باسات') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'Teramont', 'تيرامونت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Volkswagen_id, 'T-Roc', 'تي روك') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Audi_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Audi', 'أودي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Audi_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'A3', 'A3') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'A4', 'A4') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'A6', 'A6') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'A8', 'A8') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'Q3', 'Q3') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'Q5', 'Q5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'Q7', 'Q7') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Audi_id, 'Q8', 'Q8') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Porsche_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Porsche', 'بورش') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Porsche_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Porsche_id, 'Cayenne', 'كايين') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Porsche_id, 'Macan', 'ماكان') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Porsche_id, 'Panamera', 'باناميرا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Porsche_id, '911', '911') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Porsche_id, 'Taycan', 'تايكان') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Suzuki_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Suzuki', 'سوزوكي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Suzuki_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Jimny', 'جيمني') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Swift', 'سويفت') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Vitara', 'فيتارا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Dzire', 'ديزاير') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Baleno', 'بالينو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Suzuki_id, 'Ertiga', 'إرتيجا') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_MG_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('MG', 'إم جي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_MG_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'ZS', 'ZS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'RX5', 'RX5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'RX8', 'RX8') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'HS', 'HS') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'MG 5', 'MG 5') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'MG 6', 'MG 6') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'GT', 'GT') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_MG_id, 'One', 'One') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Changan_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Changan', 'شانجان') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Changan_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'CS95', 'CS95') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'CS85', 'CS85') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'CS75 Plus', 'CS75 بلس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'CS35 Plus', 'CS35 بلس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'Eado Plus', 'ايدو بلس') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'Alsvin', 'السفين') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'UNI-K', 'UNI-K') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'UNI-T', 'UNI-T') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Changan_id, 'UNI-V', 'UNI-V') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Geely_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Geely', 'جيلي') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Geely_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Coolray', 'كولراي') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Tugella', 'توجيلا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Monjaro', 'مونجارو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Azkarra', 'ازكارا') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Okavango', 'اوكا فانجو') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Geely_id, 'Emgrand', 'امجراند') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;

DO $$
DECLARE
  make_Haval_id UUID;
BEGIN
  INSERT INTO vehicle_makes (name, name_ar) 
  VALUES ('Haval', 'هافال') 
  ON CONFLICT (name) DO UPDATE SET name_ar = EXCLUDED.name_ar 
  RETURNING id INTO make_Haval_id;

  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Haval_id, 'H6', 'H6') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Haval_id, 'Jolion', 'جوليون') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Haval_id, 'H9', 'H9') 
  ON CONFLICT (make_id, name) DO NOTHING;
  INSERT INTO vehicle_models (make_id, name, name_ar) 
  VALUES (make_Haval_id, 'Dargo', 'دارجو') 
  ON CONFLICT (make_id, name) DO NOTHING;
END $$;
