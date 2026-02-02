
import React, { useState, useEffect, useMemo } from 'react';
import { Bill, Participant, BillItem, UserSummary } from './types';
import { BillList } from './components/BillList';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { Modal } from './components/Modal';
import { SummaryPanel } from './components/SummaryPanel';
import { formatLKR } from './utils/currency';
import { calculateSummaries } from './utils/splitLogic';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const STORAGE_KEY = 'bill_keeper_lkr_data';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const App: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('bill_keeper_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [viewingSummary, setViewingSummary] = useState<UserSummary | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', quantity: '1' });

  // Load initial data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBills(parsed);
        if (parsed.length > 0) setActiveBillId(parsed[0].id);
      } catch (e) {
        console.error("Failed to parse stored bills", e);
      }
    }
  }, []);

  // Save on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  // Theme management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bill_keeper_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const activeBill = useMemo(() => bills.find(b => b.id === activeBillId) || null, [bills, activeBillId]);

  const handleCreateBill = () => {
    const newBill: Bill = {
      id: generateId(),
      title: 'New Bill',
      date: new Date().toISOString().split('T')[0],
      participants: [],
      items: [],
      createdAt: Date.now()
    };
    setBills(prev => [...prev, newBill]);
    setActiveBillId(newBill.id);
  };

  const handleUpdateBill = (updated: Bill) => {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const handleDeleteBill = (id: string) => {
    if (confirm("Are you sure you want to delete this entire bill? This cannot be undone.")) {
      const updatedBills = bills.filter(b => b.id !== id);
      setBills(updatedBills);
      if (activeBillId === id) {
        setActiveBillId(updatedBills.length > 0 ? updatedBills[0].id : null);
      }
    }
  };

  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill || !newParticipant.name.trim()) return;
    handleUpdateBill({
      ...activeBill,
      participants: [...activeBill.participants, { id: generateId(), name: newParticipant.name.trim(), email: newParticipant.email.trim() || undefined }]
    });
    setNewParticipant({ name: '', email: '' });
    setIsAddParticipantOpen(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    if (!activeBill) return;
    if (confirm("Remove this participant? Their assignments will be cleared from all items.")) {
      const updatedItems = activeBill.items.map(item => {
        const updatedAssigned = item.assignedTo.filter(id => id !== participantId);
        return {
          ...item,
          assignedTo: updatedAssigned,
          isShared: updatedAssigned.length === 0 ? true : item.isShared
        };
      });

      handleUpdateBill({
        ...activeBill,
        participants: activeBill.participants.filter(p => p.id !== participantId),
        items: updatedItems
      });
    }
  };

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill || !newItem.name.trim()) return;
    const price = parseFloat(newItem.price);
    const qty = parseInt(newItem.quantity) || 1;
    if (isNaN(price)) return;
    
    handleUpdateBill({
      ...activeBill,
      items: [...activeBill.items, { 
        id: generateId(), 
        name: newItem.name.trim(), 
        quantity: qty, 
        unitPrice: price, 
        total: price * qty, 
        assignedTo: [], 
        isShared: true 
      }]
    });
    setNewItem({ name: '', price: '', quantity: '1' });
    setIsAddItemOpen(false);
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBill || !editingItem) return;
    const price = parseFloat(editingItem.unitPrice.toString());
    const qty = parseInt(editingItem.quantity.toString()) || 1;
    
    handleUpdateBill({
      ...activeBill,
      items: activeBill.items.map(item => item.id === editingItem.id ? {
        ...editingItem,
        unitPrice: price,
        quantity: qty,
        total: price * qty
      } : item)
    });
    setEditingItem(null);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeBill) return;
    if (confirm("Delete this item?")) {
      handleUpdateBill({
        ...activeBill,
        items: activeBill.items.filter(i => i.id !== itemId)
      });
    }
  };

  const toggleItemAssignment = (itemId: string, participantId: string) => {
    if (!activeBill) return;
    handleUpdateBill({
      ...activeBill,
      items: activeBill.items.map(item => {
        if (item.id !== itemId) return item;
        let newAssigned;
        if (item.isShared) { 
          newAssigned = [participantId]; 
        } else { 
          newAssigned = item.assignedTo.includes(participantId) 
            ? item.assignedTo.filter(id => id !== participantId) 
            : [...item.assignedTo, participantId]; 
        }
        return { 
          ...item, 
          isShared: newAssigned.length === 0, 
          assignedTo: newAssigned 
        };
      })
    });
  };

  const handleSendReportViaClient = (summary: UserSummary) => {
    const subject = encodeURIComponent(`Bill Split for ${activeBill?.title || 'Bill'}`);
    const itemsText = summary.assignedItems.map(i => `${i.itemName}${i.isShared ? ' (Shared)' : ''}: ${formatLKR(i.amount)}`).join('\n');
    const body = encodeURIComponent(`Hello ${summary.participant.name},\n\nHere is your split for ${activeBill?.title || 'the bill'} on ${activeBill?.date}:\n\n${itemsText}\n\nTotal Payable: ${formatLKR(summary.totalAmount)}\n\nSent via Bill Keeper LKR`);
    window.location.href = `mailto:${summary.participant.email}?subject=${subject}&body=${body}`;
  };

  const handleSendReport = async (summary: UserSummary) => {
     if (!summary.participant.email) return;
     setEmailStatus({ message: "Sending email...", type: 'info' });
     try {
        const res = await fetch('/api/send-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report: summary, billDate: activeBill?.date, billTitle: activeBill?.title })
        });
        
        if (res.status === 404) {
          setEmailStatus({ message: "Backend not found. Opening email app...", type: 'info' });
          setTimeout(() => handleSendReportViaClient(summary), 1500);
          return;
        }

        if (res.ok) {
           setEmailStatus({ message: `Report sent to ${summary.participant.name}`, type: 'success' });
        } else {
           const err = await res.json();
           setEmailStatus({ message: err.error || "Failed to send email. Opening email app...", type: 'error' });
           setTimeout(() => handleSendReportViaClient(summary), 2000);
        }
     } catch (e) {
        setEmailStatus({ message: "Network error. Opening email app...", type: 'error' });
        setTimeout(() => handleSendReportViaClient(summary), 2000);
     }
  };

  const handleExportPDF = () => {
    if (!activeBill) return;
    setIsExportingPDF(true);
    try {
      const doc = new jsPDF();
      const summaries = calculateSummaries(activeBill);
      const totalAmount = activeBill.items.reduce((sum, item) => sum + item.total, 0);
      
      doc.setFontSize(22);
      doc.setTextColor(14, 165, 233);
      doc.text('Bill Keeper – LKR', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 28);
      
      doc.setFontSize(14);
      doc.setTextColor(40);
      doc.text(`Bill: ${activeBill.title || 'Untitled Bill'}`, 14, 40);
      doc.text(`Date: ${activeBill.date}`, 14, 48);
      
      doc.setFontSize(16);
      doc.text(`Total Amount: ${formatLKR(totalAmount)}`, 14, 58);
      
      doc.setFontSize(12);
      doc.text('Summary of Split:', 14, 70);
      
      const summaryRows = summaries.map(s => [s.participant.name, s.participant.email || 'N/A', formatLKR(s.totalAmount)]);
      
      autoTable(doc, { 
        startY: 75, 
        head: [['Name', 'Email', 'Amount Due']], 
        body: summaryRows, 
        theme: 'grid', 
        headStyles: { fillColor: [2, 132, 199] }, 
        margin: { horizontal: 14 } 
      });
      
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Detailed Items:', 14, finalY);
      
      const itemRows = activeBill.items.map(item => [
        item.name, 
        item.quantity.toString(), 
        formatLKR(item.unitPrice), 
        item.isShared ? 'Shared' : activeBill.participants.filter(p => item.assignedTo.includes(p.id)).map(p => p.name).join(', '), 
        formatLKR(item.total)
      ]);
      
      autoTable(doc, { 
        startY: finalY + 5, 
        head: [['Item', 'Qty', 'Unit Price', 'Assigned To', 'Total']], 
        body: itemRows, 
        theme: 'striped', 
        headStyles: { fillColor: [71, 85, 105] }, 
        margin: { horizontal: 14 } 
      });
      
      doc.save(`Bill_${activeBill.title || 'Export'}_${activeBill.date}.pdf`);
    } catch (error: any) {
      alert(`PDF Generation failed:\n${error.message}`);
    } finally { 
      setIsExportingPDF(false); 
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-80 h-auto md:h-full flex-shrink-0">
        <BillList bills={bills} activeBillId={activeBillId} onSelectBill={setActiveBillId} onNewBill={handleCreateBill} />
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {activeBill ? (
                <input 
                  type="text" 
                  value={activeBill.title || ''} 
                  onChange={(e) => handleUpdateBill({...activeBill, title: e.target.value})} 
                  className="bg-transparent border-none focus:ring-0 p-0 hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 transition-colors" 
                  placeholder="Bill Title" 
                />
              ) : 'Select a Bill'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeBill ? ( 
                <input 
                  type="date" 
                  value={activeBill.date} 
                  onChange={(e) => handleUpdateBill({...activeBill, date: e.target.value})} 
                  className="bg-transparent border-none focus:ring-0 p-0 text-slate-500 text-xs uppercase font-bold tracking-widest cursor-pointer" 
                /> 
              ) : 'Create your first bill to start'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? ( <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path></svg> ) : ( <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg> )}
            </Button>
            {activeBill && ( <Button variant="outline" size="sm" onClick={handleExportPDF} isLoading={isExportingPDF}>Export PDF</Button> )}
            {activeBill && ( <Button variant="danger" size="sm" onClick={() => handleDeleteBill(activeBill.id)}>Delete Bill</Button> )}
          </div>
        </header>

        {activeBill ? (
          <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Participants List */}
                <Card title="Participants" actions={<Button size="sm" onClick={() => setIsAddParticipantOpen(true)}>Add Person</Button>}>
                  <div className="flex flex-wrap gap-2">
                    {activeBill.participants.length === 0 && ( <p className="text-slate-400 text-sm italic">Add people to split the bill.</p> )}
                    {activeBill.participants.map(p => (
                      <div key={p.id} className="inline-flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full text-sm group">
                        <span className="font-medium mr-2">{p.name}</span>
                        <button 
                          onClick={() => handleRemoveParticipant(p.id)} 
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove Participant"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Bill Items Table */}
                <Card title="Bill Items" actions={<Button size="sm" onClick={() => setIsAddItemOpen(true)}>Add Item</Button>}>
                  <div className="overflow-x-auto -mx-6">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-6 py-3 text-left">Item</th>
                          <th className="px-6 py-3 text-left">Qty</th>
                          <th className="px-6 py-3 text-left">Price</th>
                          <th className="px-6 py-3 text-left">Assign</th>
                          <th className="px-6 py-3 text-left">Total</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activeBill.items.length === 0 && ( 
                          <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">No items added to this bill.</td></tr> 
                        )}
                        {activeBill.items.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 group">
                            <td className="px-6 py-4 font-medium dark:text-slate-200">{item.name}</td>
                            <td className="px-6 py-4">{item.quantity}</td>
                            <td className="px-6 py-4">{formatLKR(item.unitPrice)}</td>
                            <td className="px-6 py-4">
                               <div className="flex flex-wrap gap-1">
                                  {activeBill.participants.map(p => (
                                    <button 
                                      key={p.id} 
                                      onClick={() => toggleItemAssignment(item.id, p.id)} 
                                      title={`Assign to ${p.name}`} 
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${ !item.isShared && item.assignedTo.includes(p.id) ? 'bg-primary-500 border-primary-600 text-white shadow-sm' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-400' }`} 
                                    >
                                      {p.name.charAt(0)}
                                    </button>
                                  ))}
                                  {item.isShared && ( <span className="text-[10px] text-primary-500 font-bold ml-1 uppercase tracking-tighter">Shared</span> )}
                               </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{formatLKR(item.total)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingItem(item)}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title="Edit Item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Delete Item"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Summary View */}
              <div className="lg:col-span-1">
                 <SummaryPanel bill={activeBill} onViewReport={setViewingSummary} onSendEmail={handleSendReport} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-950/30 text-primary-600 rounded-full flex items-center justify-center mb-6">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to split a bill?</h2>
            <p className="text-slate-500 max-w-sm mb-8">Choose an existing bill from the sidebar or create a new one to manage your expenses.</p>
            <Button size="lg" onClick={handleCreateBill}>Create New Bill</Button>
          </div>
        )}

        {/* Modal: Add Participant */}
        <Modal isOpen={isAddParticipantOpen} onClose={() => setIsAddParticipantOpen(false)} title="Add Participant">
          <form onSubmit={handleAddParticipantSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input autoFocus type="text" required value={newParticipant.name} onChange={e => setNewParticipant({...newParticipant, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email (Optional)</label>
              <input type="email" value={newParticipant.email} onChange={e => setNewParticipant({...newParticipant, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="john@example.com" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsAddParticipantOpen(false)}>Cancel</Button>
              <Button type="submit">Add Participant</Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Item */}
        <Modal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} title="Add Bill Item">
          <form onSubmit={handleAddItemSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
              <input autoFocus type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="Lunch / Grocery / Taxi" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Price (LKR)</label>
                <input type="number" step="0.01" required value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                <input type="number" min="1" required value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
              <Button type="submit">Add Item</Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Edit Item */}
        <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item Details">
          <form onSubmit={handleEditItemSubmit} className="space-y-4">
            {editingItem && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                  <input autoFocus type="text" required value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Price (LKR)</label>
                    <input type="number" step="0.01" required value={editingItem.unitPrice} onChange={e => setEditingItem({...editingItem, unitPrice: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                    <input type="number" min="1" required value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancel</Button>
                  <Button type="submit">Update Item</Button>
                </div>
              </>
            )}
          </form>
        </Modal>

        {/* Modal: Individual Report */}
        <Modal isOpen={!!viewingSummary} onClose={() => setViewingSummary(null)} title={`Report for ${viewingSummary?.participant.name}`} footer={ <> <Button variant="secondary" onClick={() => setViewingSummary(null)}>Close</Button> {viewingSummary?.participant.email && ( <Button onClick={() => { if(viewingSummary) handleSendReport(viewingSummary); setViewingSummary(null); }}>Automatic Email</Button> )} {viewingSummary?.participant.email && ( <Button variant="outline" onClick={() => { if(viewingSummary) handleSendReportViaClient(viewingSummary); }}>Open in Mail App</Button> )} </> } >
          {viewingSummary && (
            <div className="space-y-6">
              <div className="flex justify-between border-b pb-4 border-slate-100 dark:border-slate-800">
                <div><p className="text-xs text-slate-400 font-bold uppercase">Date</p><p className="font-semibold">{activeBill?.date}</p></div>
                <div className="text-right"><p className="text-xs text-slate-400 font-bold uppercase">Bill Total</p><p className="font-semibold">{activeBill ? formatLKR(activeBill.items.reduce((a,c) => a+c.total, 0)) : '-'}</p></div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Item Breakdown</p>
                {viewingSummary.assignedItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/50">
                    <div><span className="font-medium">{item.itemName}</span>{item.isShared && <span className="ml-2 text-[10px] bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-1.5 py-0.5 rounded-full uppercase">Shared</span>}</div>
                    <span className="font-bold">{formatLKR(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex justify-between items-center">
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Total Payable</span>
                <span className="text-2xl font-black text-primary-600">{formatLKR(viewingSummary.totalAmount)}</span>
              </div>
            </div>
          )}
        </Modal>

        {/* Status Toast */}
        {emailStatus && (
          <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-10 duration-300 ${ emailStatus.type === 'success' ? 'bg-emerald-600 text-white' : emailStatus.type === 'info' ? 'bg-primary-600 text-white' : 'bg-red-600 text-white' }`}>
            <span className="font-medium">{emailStatus.message}</span>
            <button onClick={() => setEmailStatus(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
