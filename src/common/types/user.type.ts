export interface IUser {
  id: string;
  fuel: number;
  air: number;
  isSubscribed: boolean;
  languageCode: string;
  subscribedUntil?: string | null;
}
