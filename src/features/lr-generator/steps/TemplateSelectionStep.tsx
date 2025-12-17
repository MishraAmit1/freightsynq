// src/features/lr-generator/steps/TemplateSelectionStep.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  Minimize2,
  List,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  code: string;
  name: string;
  description: string;
  features: string[];
  layout: "landscape" | "portrait";
  icon: any;
  color: string;
}

const TEMPLATES: Template[] = [
  {
    code: "standard",
    name: "Standard Format",
    description:
      "Professional landscape layout with all essential details. Most commonly used format.",
    features: [
      "Complete Details",
      "GST Ready",
      "Professional Look",
      "Landscape A4",
    ],
    layout: "landscape",
    icon: FileText,
    color: "bg-blue-500",
  },
  {
    code: "minimal",
    name: "Minimal Format",
    description:
      "Clean and simple portrait format with essential fields only. Quick to read.",
    features: [
      "Quick Print",
      "Essential Fields",
      "Space Efficient",
      "Portrait A4",
    ],
    layout: "portrait",
    icon: Minimize2,
    color: "bg-green-500",
  },
  {
    code: "detailed",
    name: "Detailed Format",
    description:
      "Comprehensive landscape format with all possible fields and sections.",
    features: [
      "All Fields",
      "Extra Notes",
      "Multiple Sections",
      "Complete Info",
    ],
    layout: "landscape",
    icon: List,
    color: "bg-purple-500",
  },
  {
    code: "gst_invoice",
    name: "GST Invoice Style",
    description:
      "GST compliant portrait format designed like a tax invoice with tax breakdown.",
    features: [
      "GST Compliant",
      "Tax Breakdown",
      "Invoice Style",
      "HSN/SAC Ready",
    ],
    layout: "portrait",
    icon: Receipt,
    color: "bg-orange-500",
  },
];

interface TemplateSelectionStepProps {
  onSelect: (templateCode: string) => void;
}

export const TemplateSelectionStep = ({
  onSelect,
}: TemplateSelectionStepProps) => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
          Choose Your LR Template
        </h2>
        <p className="text-muted-foreground dark:text-muted-foreground">
          Select a template that best fits your business needs. You can change
          it later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map((template) => (
          <Card
            key={template.code}
            className={cn(
              "cursor-pointer transition-all duration-200 border-2 hover:shadow-lg group",
              "border-border dark:border-border hover:border-primary dark:hover:border-primary",
              "bg-card dark:bg-card"
            )}
            onClick={() => onSelect(template.code)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={cn(
                    "p-3 rounded-xl text-white flex-shrink-0",
                    template.color
                  )}
                >
                  <template.icon className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-foreground dark:text-white">
                      {template.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-xs border-primary/30 text-primary"
                    >
                      {template.layout}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {template.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-xs bg-accent dark:bg-secondary"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full bg-primary hover:bg-primary-hover text-primary-foreground group-hover:shadow-md transition-all">
                    Select This Template
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
