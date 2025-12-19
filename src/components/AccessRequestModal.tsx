import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { createAccessRequest } from "@/api/access-requests";
import { useToast } from "@/hooks/use-toast";

interface AccessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureIcon: any;
  features: string[];
}

export const AccessRequestModal = ({
  open,
  onOpenChange,
  featureName,
  featureIcon: FeatureIcon,
  features,
}: AccessRequestModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    reason: "",
    business_type: "",
    expected_monthly_bookings: "",
    additional_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reason.trim()) {
      toast({
        title: "❌ Required Field",
        description: "Please tell us why you need access",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await createAccessRequest({
        requested_features: features,
        reason: formData.reason.trim(),
        business_type: formData.business_type || undefined,
        expected_monthly_bookings: formData.expected_monthly_bookings
          ? parseInt(formData.expected_monthly_bookings)
          : undefined,
        additional_notes: formData.additional_notes.trim() || undefined,
      });

      setSubmitted(true);
      toast({
        title: "✅ Request Submitted",
        description: "We'll review your request within 24-48 hours",
      });

      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setFormData({
          reason: "",
          business_type: "",
          expected_monthly_bookings: "",
          additional_notes: "",
        });
      }, 3000);
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Request Submitted!</h3>
            <p className="text-muted-foreground mb-4">
              We've received your request for full access.
            </p>
            <p className="text-sm text-muted-foreground">
              Our team will review it within 24-48 hours and notify you via
              email.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-full">
              <FeatureIcon className="w-10 h-10 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Request Full Access
          </DialogTitle>
          <DialogDescription className="text-center">
            Tell us about your business needs and we'll review your request
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Features Requested */}
          <div className="bg-accent/50 dark:bg-secondary/50 p-4 rounded-lg">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Features You're Requesting:
            </p>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
          {/* Why do you need access */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Why do you need full access?{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Tell us about your business and how these features will help you..."
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              rows={4}
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Help us understand your use case
            </p>
          </div>

          {/* Business Type */}
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type</Label>
            <Select
              value={formData.business_type}
              onValueChange={(value) =>
                setFormData({ ...formData, business_type: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your business type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transporter">Transporter</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
                <SelectItem value="3pl">3PL</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="shipper">Shipper</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monthly Bookings */}
          <div className="space-y-2">
            <Label htmlFor="bookings">
              Expected Monthly Bookings/Shipments
            </Label>
            <Input
              id="bookings"
              type="number"
              placeholder="e.g., 150"
              value={formData.expected_monthly_bookings}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  expected_monthly_bookings: e.target.value,
                })
              }
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Approximate volume helps us understand your needs
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any other information you'd like to share..."
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData({ ...formData, additional_notes: e.target.value })
              }
              rows={3}
              disabled={loading}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
