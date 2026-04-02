export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  fuel: number;
  air: number;
  isSubscribed: boolean;
  languageCode: string;
  subscribedUntil?: string | null;
}
