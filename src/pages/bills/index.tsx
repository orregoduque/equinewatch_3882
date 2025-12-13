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
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
      </div>

      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full bg-gradient-to-b from-[#c9a962] to-[#a88a45]" />
                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6]">
                    Billing <span className="gradient-text font-medium">History</span>
                  </h1>
                  <p className="text-base mt-2 font-light text-[#a8a8a8] tracking-wide">
                    View and manage your subscription invoices
                  </p>
                </div>
              </div>
            </div>

            {totalOutstanding > 0 && (
              <div className="glass-card p-6 luxury-border bg-[#c9a962]/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[#c9a962]/10 border border-[#c9a962]/20">
                      <Icon name="CreditCard" size={24} className="text-[#c9a962]" />
                    </div>
                    <div>
                      <p className="text-sm text-[#a8a8a8]">Outstanding Balance</p>
                      <p className="text-2xl font-semibold text-[#c9a962]">{formatCurrency(totalOutstanding)}</p>
                    </div>
                  </div>
                  <button className="px-6 py-3 luxury-button rounded-xl text-sm font-medium flex items-center gap-2">
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
                  className="glass-card luxury-border overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
                          <Icon name="FileText" size={20} className="text-[#c9a962]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-[#faf9f6]">{bill.period}</h3>
                          <p className="text-sm text-[#a8a8a8]">
                            {bill.status === 'paid' 
                              ? `Paid on ${formatDate(bill.paidDate!)}` 
                              : `Due ${formatDate(bill.dueDate)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-semibold text-[#faf9f6]">{formatCurrency(bill.amount)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#c9a962]/10 pt-4 mt-4">
                      <div className="space-y-2">
                        {bill.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-[#a8a8a8]">{item.description}</span>
                            <span className="text-[#faf9f6]">{formatCurrency(item.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-white/[0.02] border-t border-[#c9a962]/10 flex items-center justify-end gap-3">
                    <button className="text-sm text-[#a8a8a8] hover:text-[#c9a962] transition-colors flex items-center gap-2">
                      <Icon name="Download" size={14} />
                      Download PDF
                    </button>
                    {bill.status !== 'paid' && (
                      <button className="px-4 py-2 rounded-lg bg-[#c9a962]/10 border border-[#c9a962]/20 text-sm text-[#c9a962] hover:bg-[#c9a962]/20 transition-colors flex items-center gap-2">
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
