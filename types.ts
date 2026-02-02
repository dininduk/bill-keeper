
export interface Participant {
  id: string;
  name: string;
  email?: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  assignedTo: string[]; // List of Participant IDs. Empty means shared by all.
  isShared: boolean;
}

export interface Bill {
  id: string;
  title?: string;
  date: string;
  participants: Participant[];
  items: BillItem[];
  createdAt: number;
}

export interface UserSummary {
  participant: Participant;
  assignedItems: {
    itemName: string;
    amount: number;
    isShared: boolean;
  }[];
  totalAmount: number;
}
