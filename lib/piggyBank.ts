/** 存錢罐這個月實際存下的金額:想存的金額跟結餘取小的,結餘是負的就是 0。 */
export function piggyBankSaved(balance: number, amount: number): number {
  return Math.max(Math.min(balance, amount), 0);
}
