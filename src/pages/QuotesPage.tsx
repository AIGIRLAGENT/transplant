import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Eye, DollarSign, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NewQuotePage } from '@/pages/NewQuotePage';
import { useQuotes } from '@/hooks/useQuotes';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusColors = {
  DRAFT: 'bg-gray-500/10 text-gray-600',
  SENT: 'bg-blue-500/10 text-blue-600',
  VIEWED: 'bg-purple-500/10 text-purple-600',
  ACCEPTED: 'bg-green-500/10 text-green-600',
  REJECTED: 'bg-red-500/10 text-red-600',
  EXPIRED: 'bg-orange-500/10 text-orange-600',
};

export function QuotesPage() {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: quotes = [], isLoading } = useQuotes();

  const stats = {
    total: quotes.length,
    sent: quotes.filter(q => q.status === 'SENT').length,
    viewed: quotes.filter(q => q.status === 'VIEWED').length,
    draft: quotes.filter(q => q.status === 'DRAFT').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading quotes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground mt-1">Create and manage patient quotes</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Quote
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Quotes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                </div>
                <Badge className="bg-blue-500/10 text-blue-600">SENT</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Viewed</p>
                  <p className="text-2xl font-bold">{stats.viewed}</p>
                </div>
                <Badge className="bg-purple-500/10 text-purple-600">VIEWED</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Drafts</p>
                  <p className="text-2xl font-bold">{stats.draft}</p>
                </div>
                <Badge className="bg-gray-500/10 text-gray-600">DRAFT</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quotes List */}
      <div className="flex-1 overflow-auto p-6">
        {quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No quotes yet</h3>
            <p className="text-muted-foreground mb-4">Create your first quote to get started</p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-5 w-5" />
              Create Quote
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 max-w-6xl mx-auto">
            {quotes.map((quote) => {
              const totalGrafts = quote.items.reduce((sum, item) => sum + item.graftCount, 0);
              
              return (
                <Card key={quote.id} className="glass-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/quotes/${quote.id}`)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Quote #{quote.id}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>Patient ID: {quote.patientId}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="font-semibold text-lg flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(quote.total, quote.currency)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Estimated Grafts</p>
                            <p className="font-semibold">{totalGrafts} grafts</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="font-medium flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(quote.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Valid For</p>
                            <p className="font-medium">{quote.validity} days</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge className={statusColors[quote.status as keyof typeof statusColors]}>
                          {quote.status}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Quote Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create New Quote
            </DialogTitle>
            <DialogDescription>
              Build a detailed quote for hair transplant procedure
            </DialogDescription>
          </DialogHeader>
          <NewQuotePage onSuccess={() => setIsCreateModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
