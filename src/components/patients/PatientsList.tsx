import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, UserCircle, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { generatePatientPdf } from '@/lib/pdf';
import { useTheme } from '@/contexts/ThemeContext';

const statusColors = {
  'new-lead': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'lead': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'consulted': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'quoted': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'booked': 'bg-green-500/10 text-green-500 border-green-500/20',
  'completed': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  'cancelled': 'bg-red-500/10 text-red-500 border-red-500/20',
};

type SortField = 'name' | 'age' | 'status' | 'funnelStage' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export function PatientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const { tenant } = useTheme();

  const { data: patients, isLoading } = usePatients({ search, status: statusFilter });

  const sortedPatients = useMemo(() => {
    if (!patients) return [];
    const sorted = [...patients].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'age':
          aVal = a.age || 0;
          bVal = b.age || 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'funnelStage':
          aVal = a.funnelStage || 'lead';
          bVal = b.funnelStage || 'lead';
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [patients, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className='h-4 w-4 opacity-50' />;
    return sortDirection === 'asc' ? <ArrowUp className='h-4 w-4' /> : <ArrowDown className='h-4 w-4' />;
  };

  const downloadPatientPdf = async (e: React.MouseEvent, patient: any) => {
    e.stopPropagation();
    const emailText = `Dear patient,\n\nIt was a pleasure meeting with you at Clinic and thank you for your interest in our advanced Hair Transplant services.\n\nAs discussed during our consultation, you have thinning in the zones A, B and C.\n\nYour donor area has good quality and density, which allows for optimal graft extraction and strong coverage.\n\nWe recommend a Two-Days Session, during which our experienced team will focus on increasing density in both the frontal Gulf, Mid and Back scalp zones so that you may feel confident and style your hair as you wish.\n\nCosting:\n\nThe total price for the session is AED 18,750 (VAT inclusive).\n\nDeposit required upon booking session date: AED 5,000 (Tax Inclusive).\n\nThe remaining balance is due either before or on the day of your session.\n\nPre-op appointment (blood tests): AED 367.50 (Tax Inclusive)\n\nPost medicines: (depends on the prescription)\n\nThe procedure is minimally invasive and performed under local anesthesia. You’ll be able to relax, listen to music, watch TV, and enjoy a light lunch during the session.\n\nAs part of your treatment, we will also include one complimentary PRP (Platelet-Rich Plasma) to support healing and maximize graft survival.\n\nPostoperative Care Plan (3 visits):\n• Day 2: Bandage removal\n• Day 5: Post-op wash and scalp check\n• Day 10: Final post-op shampoo and evaluation\n\nFollow-up evaluations will also be scheduled at 1, 3, 6, and 12 months, free of charge, to monitor your progress and support optimal long-term results.\n\nWhat to Expect:\n• Minimally invasive procedure with no linear scarring\n• Quick recovery with minimal discomfort\n• High graft survival rate using advanced techniques and preservation solutions\n• Natural-looking results through precise control of angle, direction, and density\n\nIf you have any questions or need clarification, please don’t hesitate to get in touch. We are here to ensure you feel informed and supported throughout your journey.\n\nKind regards,\n\nHair Transplant Team.`;

    const afterGallery = patient.afterImageUrls && patient.afterImageUrls.length > 0
      ? patient.afterImageUrls
      : patient.afterImageUrl
        ? [patient.afterImageUrl]
        : [];

    const contactLines: string[] = [];
    if (tenant?.emailFrom) contactLines.push(`Email: ${tenant.emailFrom}`);
    if (tenant?.domain) contactLines.push(`Website: ${tenant.domain}`);

    const blob = await generatePatientPdf({
      patientName: `${patient.firstName} ${patient.lastName}`,
      emailBody: emailText,
      beforeImageUrl: patient.beforeImageUrl,
      afterImageUrls: afterGallery,
      clinicName: tenant?.name || 'Clinic',
      clinicTagline: 'Advanced Hair Restoration & Patient Experience',
      clinicLogoUrl: tenant?.logo || tenant?.themeObject?.logoUrl,
      clinicContactLines: contactLines,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consultation_${patient.firstName || 'patient'}_${patient.lastName || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='space-y-6 p-8'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Patients</h1>
          <p className='text-muted-foreground'>Manage your patient records and consultations</p>
        </div>
        <Button onClick={() => navigate('/patients/new')}>
          <Plus className='mr-2 h-4 w-4' />
          Add Patient
        </Button>
      </div>
      <Card className='glass-card p-4'>
        <div className='flex gap-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input placeholder='Search by name, email, or phone...' value={search} onChange={(e) => setSearch(e.target.value)} className='pl-9 glass' />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className='px-4 py-2 rounded-md border bg-background glass'>
            <option value=''>All Statuses</option>
            <option value='new-lead'>New Lead</option>
            <option value='consulted'>Consulted</option>
            <option value='quoted'>Quoted</option>
            <option value='booked'>Booked</option>
            <option value='completed'>Completed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </div>
      </Card>
      {isLoading ? (
        <Card className='glass-card p-6'><div className='space-y-4'>{[1,2,3,4,5].map(i => <div key={i} className='h-20 bg-muted rounded animate-pulse' />)}</div></Card>
      ) : sortedPatients && sortedPatients.length > 0 ? (
  <Card className='glass-card overflow-hidden'><div className='overflow-x-auto'><table className='w-full'><thead className='border-b border-border bg-muted/30'><tr><th className='text-left p-4 font-semibold'>Photo</th><th className='text-left p-4 font-semibold cursor-pointer hover:bg-muted/50 transition-colors' onClick={() => handleSort('name')}><div className='flex items-center gap-2'>Name<SortIcon field='name' /></div></th><th className='text-left p-4 font-semibold cursor-pointer hover:bg-muted/50 transition-colors' onClick={() => handleSort('age')}><div className='flex items-center gap-2'>Age<SortIcon field='age' /></div></th><th className='text-left p-4 font-semibold'>Contact</th><th className='text-left p-4 font-semibold cursor-pointer hover:bg-muted/50 transition-colors' onClick={() => handleSort('status')}><div className='flex items-center gap-2'>Status<SortIcon field='status' /></div></th><th className='text-left p-4 font-semibold cursor-pointer hover:bg-muted/50 transition-colors' onClick={() => handleSort('funnelStage')}><div className='flex items-center gap-2'>Stage<SortIcon field='funnelStage' /></div></th><th className='text-left p-4 font-semibold cursor-pointer hover:bg-muted/50 transition-colors' onClick={() => handleSort('createdAt')}><div className='flex items-center gap-2'>Created<SortIcon field='createdAt' /></div></th><th className='text-left p-4 font-semibold'>Actions</th></tr></thead><tbody>{sortedPatients.map(patient => (<tr key={patient.id} onClick={() => navigate(`/patients/${patient.id}`)} className='border-b border-border hover:bg-muted/30 cursor-pointer transition-colors group'><td className='p-4'><div className='relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center' onMouseEnter={() => setHoveredImage(patient.id)} onMouseLeave={() => setHoveredImage(null)}><UserCircle className='h-10 w-10 text-muted-foreground' />{hoveredImage === patient.id && (<div className='absolute top-0 left-20 z-50 w-48 h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-primary'><div className='w-full h-full bg-muted flex items-center justify-center'><UserCircle className='h-24 w-24 text-muted-foreground' /></div></div>)}</div></td><td className='p-4'><div><p className='font-semibold text-base'>{patient.firstName} {patient.lastName}</p><p className='text-sm text-muted-foreground capitalize'>{patient.gender || '--'}</p></div></td><td className='p-4'><span className='text-base'>{patient.age || '--'}</span></td><td className='p-4'><div className='space-y-1'><p className='text-sm font-medium truncate max-w-[200px]'>{patient.email || '--'}</p><p className='text-sm text-muted-foreground'>{patient.phone || '--'}</p></div></td><td className='p-4'><Badge className={statusColors[patient.status as keyof typeof statusColors] || 'bg-gray-500/10'}>{patient.status}</Badge></td><td className='p-4'><span className='text-sm font-medium capitalize'>{patient.funnelStage?.replace(/_/g, ' ') || 'lead'}</span></td><td className='p-4'><span className='text-sm text-muted-foreground'>{formatDate(patient.createdAt)}</span></td><td className='p-4'><Button variant='outline' size='sm' onClick={(e) => downloadPatientPdf(e, patient)} className='glass-card'><Download className='h-4 w-4 mr-2'/>PDF</Button></td></tr>))}</tbody></table></div></Card>
      ) : (
        <Card className='glass-card'><div className='text-center py-12 px-6'><UserCircle className='mx-auto h-12 w-12 text-muted-foreground' /><h3 className='mt-4 text-lg font-semibold'>No patients found</h3><p className='text-muted-foreground mt-2'>{search || statusFilter ? 'Try adjusting your filters' : 'Get started by adding your first patient'}</p>{!search && !statusFilter && (<Button onClick={() => navigate('/patients/new')} className='mt-4'><Plus className='mr-2 h-4 w-4' />Add Patient</Button>)}</div></Card>
      )}
    </div>
  );
}
