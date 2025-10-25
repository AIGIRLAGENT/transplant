import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { useCreateQuote } from '@/hooks/useQuotes';
import { usePatients } from '@/hooks/usePatients';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

const quoteItemSchema = z.object({
  zone: z.string().min(1, 'Zone is required'),
  graftCount: z.coerce.number().min(1, 'Grafts must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Price must be positive'),
});

const quoteSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  items: z.array(quoteItemSchema).min(1, 'Add at least one zone'),
  taxPercent: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).default(0),
  currency: z.string().default('USD'),
  validity: z.coerce.number().min(1).default(30),
  notes: z.string().optional(),
});

type QuoteFormInput = z.input<typeof quoteSchema>;

const zones = [
  'Hairline',
  'Front',
  'Mid-Scalp',
  'Crown',
  'Temples',
  'Vertex',
  'Beard',
  'Eyebrows',
];

interface NewQuotePageProps {
  onSuccess?: () => void;
}

export function NewQuotePage({ onSuccess }: NewQuotePageProps = {}) {
  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const createQuote = useCreateQuote();
  const { toast } = useToast();
  const { data: patients } = usePatients();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      items: [{ zone: '', graftCount: 0, unitPrice: 0 }],
      taxPercent: 0,
      discountPercent: 0,
      currency: 'USD',
      validity: 30,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');
  const taxPercent = watch('taxPercent') || 0;
  const discountPercent = watch('discountPercent') || 0;
  const currency = watch('currency');

  // Calculate totals
  const subtotal = items?.reduce((sum, item) => {
    return sum + ((item.graftCount || 0) * (item.unitPrice || 0));
  }, 0) || 0;

  const tax = subtotal * (taxPercent / 100);
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal + tax - discount;

  const onSubmit = async (data: QuoteFormInput) => {
    try {
      const currencyValue = data.currency ?? 'USD';
      const validityValue = data.validity ?? 30;

      const result = await createQuote.mutateAsync({
        tenantId: tenantId || '',
        patientId: data.patientId,
        doctorId: user?.uid || '',
        items: data.items.map(item => ({
          ...item,
          total: item.graftCount * item.unitPrice,
        })),
        status: 'DRAFT',
        version: 1,
        subtotal,
        tax,
        discount,
        total,
        currency: currencyValue,
        validity: validityValue,
      });

      toast({
        title: 'Quote created',
        description: 'Quote has been created successfully.',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(`/quotes/${result.id}`);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Selection */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="patientId">
                Select Patient <span className="text-destructive">*</span>
              </Label>
              <select
                id="patientId"
                {...register('patientId')}
                className="w-full px-3 py-2 rounded-md border bg-background"
              >
                <option value="">Select a patient</option>
                {patients?.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} - {patient.email}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="text-sm text-destructive">
                  {errors.patientId.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Treatment Zones</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ zone: '', graftCount: 0, unitPrice: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-start">
                <div className="flex-1 space-y-2">
                  <Label>Zone</Label>
                  <select
                    {...register(`items.${index}.zone`)}
                    className="w-full px-3 py-2 rounded-md border bg-background"
                  >
                    <option value="">Select zone</option>
                    {zones.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                  {errors.items?.[index]?.zone && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.zone?.message}
                    </p>
                  )}
                </div>

                <div className="w-32 space-y-2">
                  <Label>Grafts</Label>
                  <Input
                    type="number"
                    {...register(`items.${index}.graftCount`)}
                    placeholder="1500"
                  />
                  {errors.items?.[index]?.graftCount && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.graftCount?.message}
                    </p>
                  )}
                </div>

                <div className="w-32 space-y-2">
                  <Label>Price/Graft</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register(`items.${index}.unitPrice`)}
                    placeholder="3.50"
                  />
                  {errors.items?.[index]?.unitPrice && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.unitPrice?.message}
                    </p>
                  )}
                </div>

                <div className="w-32 pt-8">
                  <div className="text-sm font-medium">
                    {formatCurrency(
                      (items[index]?.graftCount || 0) * (items[index]?.unitPrice || 0),
                      currency
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {errors.items && (
              <p className="text-sm text-destructive">
                {errors.items.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pricing Details */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Pricing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxPercent">Tax (%)</Label>
                <Input
                  id="taxPercent"
                  type="number"
                  step="0.1"
                  {...register('taxPercent')}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPercent">Discount (%)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  step="0.1"
                  {...register('discountPercent')}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity">Valid For (days)</Label>
                <Input
                  id="validity"
                  type="number"
                  {...register('validity')}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                className="w-full px-3 py-2 rounded-md border bg-background min-h-[100px]"
                placeholder="Additional notes about this quote..."
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({taxPercent}%):</span>
                <span className="font-medium">{formatCurrency(tax, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({discountPercent}%):</span>
                <span className="font-medium text-green-600">
                  -{formatCurrency(discount, currency)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(total, currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting || createQuote.isPending}
          >
            {isSubmitting ? 'Creating...' : 'Create Quote'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
