import React from 'react';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Icon from '../../components/AppIcon';

interface Bill {
  id: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: Date;
  paidDate?: Date;
  items: {
    description: string;
    amount: number;
  }[];
}

const Bills: React.FC = () => {
  const mockBills: Bill[] = [
    {
      id: 'bill-1',
      period: 'December 2024',
      amount: 2499.00,
      status: 'pending',
      dueDate: new Date('2024-12-31'),
      items: [
        { description: 'Premium Monitoring Service (6 horses)', amount: 1799.00 },
        { description: 'Camera Unit Rental (6 units)', amount: 600.00 },
        { description: 'Cloud Storage (1TB)', amount: 100.00 },
      ],
    },
    {
      id: 'bill-2',
      period: 'November 2024',
      amount: 2499.00,
      status: 'paid',
      dueDate: new Date('2024-11-30'),
      paidDate: new Date('2024-11-28'),
      items: [
        { description: 'Premium Monitoring Service (6 horses)', amount: 1799.00 },
        { description: 'Camera Unit Rental (6 units)', amount: 600.00 },
        { description: 'Cloud Storage (1TB)', amount: 100.00 },
      ],
    },
    {
      id: 'bill-3',
      period: 'October 2024',
      amount: 2499.00,
      status: 'paid',
      dueDate: new Date('2024-10-31'),
      paidDate: new Date('2024-10-29'),
      items: [
        { description: 'Premium Monitoring Service (6 horses)', amount: 1799.00 },
        { description: 'Camera Unit Rental (6 units)', amount: 600.00 },
        { description: 'Cloud Storage (1TB)', amount: 100.00 },
      ],
    },
    {
      id: 'bill-4',
      period: 'September 2024',
      amount: 2199.00,
      status: 'paid',
      dueDate: new Date('2024-09-30'),
      paidDate: new Date('2024-09-27'),
      items: [
        { description: 'Premium Monitoring Service (5 horses)', amount: 1499.00 },
        { description: 'Camera Unit Rental (5 units)', amount: 500.00 },
        { description: 'Cloud Storage (1TB)', amount: 100.00 },
        { description: 'Setup Fee (1 new unit)', amount: 100.00 },
      ],
    },
  ];

  const getStatusColor = (status: Bill['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-[#4a9d6b]/20 text-[#4a9d6b] border-[#4a9d6b]/30';
      case 'pending':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
      case 'overdue':
        return 'bg-[#c75050]/20 text-[#c75050] border-[#c75050]/30';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const totalOutstanding = mockBills
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Billing History
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    View and manage your subscription invoices
                  </p>
                </div>
              </div>
            </div>

            {totalOutstanding > 0 && (
              <div className="rounded-xl p-6" style={{ backgroundColor: '#fff8ee', border: '1px solid rgba(64,53,44,0.15)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.08)', border: '1px solid rgba(64,53,44,0.15)' }}>
                      <Icon name="CreditCard" size={24} style={{ color: '#40352C' }} />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Outstanding Balance</p>
                      <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{formatCurrency(totalOutstanding)}</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 text-white transition-all hover:opacity-80" style={{ backgroundColor: '#40352C' }}>
                    <Icon name="CreditCard" size={16} />
                    Pay Now
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {mockBills.map((bill) => (
                <div
                  key={bill.id}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.1)' }}>
                          <Icon name="FileText" size={20} style={{ color: '#40352C' }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{bill.period}</h3>
                          <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>
                            {bill.status === 'paid' 
                              ? `Paid on ${formatDate(bill.paidDate!)}` 
                              : `Due ${formatDate(bill.dueDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{formatCurrency(bill.amount)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
                      <div className="space-y-2">
                        {bill.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span style={{ color: 'rgba(64,53,44,0.55)' }}>{item.description}</span>
                            <span style={{ color: '#40352C' }}>{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3 flex items-center justify-end gap-3" style={{ backgroundColor: 'rgba(64,53,44,0.03)', borderTop: '1px solid rgba(64,53,44,0.08)' }}>
                    <button className="text-sm flex items-center gap-2 transition-colors hover:opacity-70" style={{ color: 'rgba(64,53,44,0.55)' }}>
                      <Icon name="Download" size={14} />
                      Download PDF
                    </button>
                    {bill.status !== 'paid' && (
                      <button className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 text-white transition-all hover:opacity-80" style={{ backgroundColor: '#40352C' }}>
                        <Icon name="CreditCard" size={14} />
                        Pay Invoice
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default Bills;
