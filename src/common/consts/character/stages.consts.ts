export enum RoleplayStage {
    // hook
    Acquaintance = 'ACQUAINTANCE',
    Flirting = 'FLIRTING',
    Seduction = 'SEDUCTION',
  
    // resistance
    Resistance = 'RESISTANCE',
  
    // retention
    Undressing = 'UNDRESSING',
    Prelude = 'PRELUDE',
    Sex = 'SEX',
    Aftercare = 'AFTERCARE',
  }

export const STAGES_IN_ORDER = [
    RoleplayStage.Acquaintance,
    RoleplayStage.Flirting,
    RoleplayStage.Seduction,
    RoleplayStage.Resistance,
    RoleplayStage.Undressing,
    RoleplayStage.Prelude,
    RoleplayStage.Sex,
    RoleplayStage.Aftercare,
  ];
  