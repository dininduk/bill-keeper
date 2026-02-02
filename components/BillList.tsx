
import React from 'react';
import { Bill } from '../types';
import { formatLKR } from '../utils/currency';
import { getBillTotal } from '../utils/splitLogic';

interface BillListProps {
  bills: Bill[];
  activeBillId: string | null;
  onSelectBill: (id: string) => void;
  onNewBill: () => void;
}

export const BillList: React.FC<BillListProps> = ({ bills, activeBillId, onSelectBill, onNewBill }) => {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h2 className="font-bold text-xl text-primary-600 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
          Bill Keeper
        </h2>
        <button 
          onClick={onNewBill}
          className="p-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          title="Create New Bill"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {bills.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            <p className="text-sm">No bills yet.</p>
          </div>
        ) : (
          bills.sort((a,b) => b.createdAt - a.createdAt).map(bill => (
            <button
              key={bill.id}
              onClick={() => onSelectBill(bill.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 group ${
                activeBillId === bill.id 
                ? 'bg-white dark:bg-slate-900 border-primary-500 shadow-sm' 
                : 'border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold truncate max-w-[150px] dark:text-slate-100">
                  {bill.title || 'Untitled Bill'}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(bill.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {bill.participants.length} people • {bill.items.length} items
                </span>
                <span className={`text-sm font-medium ${activeBillId === bill.id ? 'text-primary-600' : 'text-slate-600 dark:text-slate-300'}`}>
                  {formatLKR(getBillTotal(bill.items))}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
