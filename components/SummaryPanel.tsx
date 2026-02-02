
import React from 'react';
import { Bill, UserSummary } from '../types';
import { formatLKR } from '../utils/currency';
import { calculateSummaries, getBillTotal } from '../utils/splitLogic';
import { Button } from './Button';

interface SummaryPanelProps {
  bill: Bill;
  onViewReport: (summary: UserSummary) => void;
  onSendEmail: (summary: UserSummary) => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ bill, onViewReport, onSendEmail }) => {
  const summaries = calculateSummaries(bill);
  const total = getBillTotal(bill.items);

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 dark:bg-primary-950/20 p-6 rounded-2xl border border-primary-100 dark:border-primary-900/50">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1 uppercase tracking-wider">Total Bill Amount</p>
            <h2 className="text-4xl font-extrabold text-primary-700 dark:text-primary-300">
              {formatLKR(total)}
            </h2>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-500 dark:text-slate-400">Average per person</p>
             <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
               {bill.participants.length > 0 ? formatLKR(total / bill.participants.length) : formatLKR(0)}
             </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold px-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          Individual Split
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {summaries.length === 0 ? (
            <p className="text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-xl">Add participants to see split</p>
          ) : (
            summaries.map((summary) => (
              <div 
                key={summary.participant.id} 
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{summary.participant.name}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{summary.participant.email || 'No email'}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold">Owes</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{formatLKR(summary.totalAmount)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onViewReport(summary)}>Report</Button>
                    {summary.participant.email && (
                       <Button size="sm" variant="primary" onClick={() => onSendEmail(summary)}>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                       </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
