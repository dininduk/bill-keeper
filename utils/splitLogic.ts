
import { Bill, Participant, UserSummary, BillItem } from '../types';
import { roundToTwo } from './currency';

export const calculateSummaries = (bill: Bill): UserSummary[] => {
  const { participants, items } = bill;
  
  return participants.map((participant) => {
    const assignedItems: UserSummary['assignedItems'] = [];
    let totalAmount = 0;

    items.forEach((item) => {
      let itemShare = 0;
      
      if (item.isShared) {
        // Shared by all
        itemShare = roundToTwo(item.total / participants.length);
        assignedItems.push({
          itemName: item.name,
          amount: itemShare,
          isShared: true
        });
        totalAmount += itemShare;
      } else if (item.assignedTo.includes(participant.id)) {
        // Shared among selected
        itemShare = roundToTwo(item.total / item.assignedTo.length);
        assignedItems.push({
          itemName: item.name,
          amount: itemShare,
          isShared: false
        });
        totalAmount += itemShare;
      }
    });

    return {
      participant,
      assignedItems,
      totalAmount: roundToTwo(totalAmount)
    };
  });
};

export const getBillTotal = (items: BillItem[]): number => {
  return items.reduce((acc, item) => acc + item.total, 0);
};
