import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, MapPin, Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface GenerateEwayBillModalProps {
    isOpen: boolean
    onClose: () => void
    booking: {
        id: string
        bookingId: string
        consignorName: string
        consigneeName: string
        fromLocation: string
        toLocation: string
        materialDescription?: string
        assignedVehicle?: {
            vehicleNumber: string
        }
        lrNumber?: string
        invoice_number?: string
    } | null
    onSuccess: () => void
}

export const GenerateEwayBillModal = ({
    isOpen,
    onClose,
    booking,
    onSuccess
}: GenerateEwayBillModalProps) => {
    const { toast } = useToast()
    const [generating, setGenerating] = useState(false)
    const [formData, setFormData] = useState({
        invoice_value: '',
        distance: '',
        hsn_code: '999999',
        gst_rate: '18'
    })

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen && booking) {
            setFormData({
                invoice_value: '',
                distance: '',
                hsn_code: '999999',
                gst_rate: '18'
            })
        }
    }, [isOpen, booking])

    const handleGenerate = async () => {
        // Validation
        if (!formData.invoice_value || !formData.distance) {
            toast({
                title: '❌ Missing Fields',
                description: 'Invoice value and distance are required',
                variant: 'destructive',
            })
            return
        }

        if (!booking) return

        setGenerating(true)

        try {
            // Get session token
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                throw new Error('Not authenticated')
            }

            console.log('🚀 Calling generate e-way bill API...')

            // Call Edge Function
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eway-bill-generate`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        booking_id: booking.id,
                        invoice_value: parseFloat(formData.invoice_value),
                        distance: parseInt(formData.distance),
                        hsn_code: formData.hsn_code,
                        gst_rate: parseFloat(formData.gst_rate)
                    }),
                }
            )

            const result = await response.json()
            console.log('📥 Response:', result)

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to generate e-way bill')
            }

            toast({
                title: '✅ E-way Bill Generated!',
                description: `E-way Bill Number: ${result.ewayBillNumber}`,
            })

            onSuccess()
            onClose()

        } catch (error: any) {
            console.error('Error generating e-way bill:', error)
            toast({
                title: '❌ Generation Failed',
                description: error.message || 'Failed to generate e-way bill',
                variant: 'destructive',
            })
        } finally {
            setGenerating(false)
        }
    }

    if (!booking) return null

    const totalValue = parseFloat(formData.invoice_value) || 0
    const gstAmount = (totalValue * parseFloat(formData.gst_rate)) / 100
    const totalInvoiceValue = totalValue + gstAmount

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Generate E-way Bill
                    </DialogTitle>
                    <DialogDescription>
                        Generate E-way Bill for booking {booking.bookingId}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Booking Info */}
                    <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">From:</span>
                                <span className="ml-2 font-medium">{booking.consignorName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">To:</span>
                                <span className="ml-2 font-medium">{booking.consigneeName}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Route:</span>
                                <span className="ml-2">{booking.fromLocation} → {booking.toLocation}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Vehicle:</span>
                                <span className="ml-2">{booking.assignedVehicle?.vehicleNumber || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Validation Checks */}
                    <div className="space-y-2">
                        {!booking.lrNumber && (
                            <Alert className="border-yellow-200 bg-yellow-50/50">
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                                <AlertDescription className="text-yellow-700 text-sm">
                                    Warning: LR not generated yet
                                </AlertDescription>
                            </Alert>
                        )}
                        {!booking.assignedVehicle && (
                            <Alert className="border-red-200 bg-red-50/50">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <AlertDescription className="text-red-700 text-sm">
                                    Error: Vehicle not assigned
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Invoice Value (₹) *</Label>
                            <Input
                                type="number"
                                placeholder="50000"
                                value={formData.invoice_value}
                                onChange={(e) => setFormData({ ...formData, invoice_value: e.target.value })}
                                disabled={generating}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Distance (KM) *</Label>
                            <Input
                                type="number"
                                placeholder="850"
                                value={formData.distance}
                                onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                                disabled={generating}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>HSN Code</Label>
                            <Input
                                placeholder="999999"
                                value={formData.hsn_code}
                                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                                disabled={generating}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>GST Rate (%)</Label>
                            <Select
                                value={formData.gst_rate}
                                onValueChange={(value) => setFormData({ ...formData, gst_rate: value })}
                                disabled={generating}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0%</SelectItem>
                                    <SelectItem value="5">5%</SelectItem>
                                    <SelectItem value="12">12%</SelectItem>
                                    <SelectItem value="18">18%</SelectItem>
                                    <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Summary */}
                    {totalValue > 0 && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="font-semibold text-sm mb-2">Invoice Summary:</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Taxable Value:</span>
                                    <span className="font-medium">₹{totalValue.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>IGST ({formData.gst_rate}%):</span>
                                    <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold border-t pt-1">
                                    <span>Total Invoice Value:</span>
                                    <span>₹{totalInvoiceValue.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <Alert>
                        <CheckCircle2 className="w-4 h-4" />
                        <AlertDescription className="text-sm">
                            E-way Bill will be generated with your saved GST credentials
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={generating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={generating || !formData.invoice_value || !formData.distance || !booking.assignedVehicle}
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate E-way Bill
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}