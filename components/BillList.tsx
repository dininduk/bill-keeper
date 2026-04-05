import React from 'react';
import { Bill } from '../types';
import { formatLKR } from '../utils/currency';
import { getBillTotal } from '../utils/splitLogic';

interface BillListProps {
  bills: Bill[];
  activeBillId: string | null;
  onSelectBill: (id: string) => void;
  onNewBill: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export const BillList: React.FC<BillListProps> = ({ bills, activeBillId, onSelectBill, onNewBill, isExpanded, onToggle }) => {
  return (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300`}>
      <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${isExpanded ? 'justify-between' : 'justify-center flex-col gap-4 py-6'}`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onToggle} 
            className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 flex-shrink-0"
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          {isExpanded && (
            <h2 className="font-bold text-xl text-primary-600 flex items-center gap-2 tracking-tight">
              Bill Keeper
            </h2>
          )}
        </div>
        <button 
          onClick={onNewBill}
          className={`rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-700 hover:shadow transition-all flex-shrink-0 flex items-center justify-center ${isExpanded ? 'p-1.5' : 'p-2'}`}
          title="Create New Bill"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto space-y-2 ${isExpanded ? 'p-4' : 'p-2'}`}>
        {bills.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            {isExpanded && <p className="text-sm">No bills yet.</p>}
          </div>
        ) : (
          bills.sort((a,b) => b.createdAt - a.createdAt).map(bill => (
            <button
              key={bill.id}
              onClick={() => onSelectBill(bill.id)}
              className={`w-full text-left rounded-xl border transition-all duration-200 group flex items-center ${
                activeBillId === bill.id 
                ? 'bg-white dark:bg-slate-900 border-primary-500 shadow-sm' 
                : 'border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-800'
              } ${isExpanded ? 'p-3' : 'p-2 justify-center'}`}
              title={bill.title || 'Untitled Bill'}
            >
              {isExpanded ? (
                <div className="block w-full">
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
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg className={`w-6 h-6 mb-1 ${activeBillId === bill.id ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span className="text-[10px] font-bold text-center tracking-tighter truncate w-12 opacity-80">{formatLKR(getBillTotal(bill.items)).replace(' LKR', '')}</span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
