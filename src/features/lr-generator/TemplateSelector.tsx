import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileText, CheckCircle2 } from "lucide-react";

interface Template {
  code: string;
  name: string;
  description: string;
  features: string[];
  layout: "landscape" | "portrait";
}

const AVAILABLE_TEMPLATES: Template[] = [
  {
    code: "standard",
    name: "Standard Format",
    description:
      "Professional layout with all essential details in landscape mode",
    features: ["Complete Details", "GST Ready", "Professional Look"],
    layout: "landscape",
  },
  {
    code: "minimal",
    name: "Minimal Format",
    description: "Clean and simple portrait format with essential fields only",
    features: ["Quick Print", "Essential Fields", "Space Efficient"],
    layout: "portrait",
  },
  {
    code: "detailed",
    name: "Detailed Format",
    description: "Comprehensive landscape format with all possible fields",
    features: ["All Fields", "Extra Notes", "Multiple Sections"],
    layout: "landscape",
  },
  {
    code: "gst_invoice",
    name: "GST Invoice Style",
    description: "GST compliant portrait format designed like a tax invoice",
    features: ["GST Compliant", "Tax Breakdown", "Invoice Style"],
    layout: "portrait",
  },
];

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateCode: string) => void;
  className?: string;
}

export const TemplateSelector = ({
  selectedTemplate,
  onTemplateChange,
  className,
}: TemplateSelectorProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        "bg-card border border-border dark:border-border",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground dark:text-white">
              Select LR Template
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            {expanded ? "Show Less" : "View All"}
          </Button>
        </div>

        {/* Compact View */}
        {!expanded && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AVAILABLE_TEMPLATES.map((template) => (
              <Button
                key={template.code}
                variant={
                  selectedTemplate === template.code ? "default" : "outline"
                }
                size="sm"
                onClick={() => onTemplateChange(template.code)}
                className={cn(
                  "relative h-auto py-3 flex flex-col items-start gap-1",
                  selectedTemplate === template.code
                    ? "bg-primary hover:bg-primary-hover text-primary-foreground border-primary"
                    : "border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                )}
              >
                {selectedTemplate === template.code && (
                  <CheckCircle2 className="absolute top-2 right-2 w-4 h-4" />
                )}
                <span className="text-sm font-medium">{template.name}</span>
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {template.layout}
                </Badge>
              </Button>
            ))}
          </div>
        )}

        {/* Expanded View */}
        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_TEMPLATES.map((template) => (
              <Card
                key={template.code}
                className={cn(
                  "cursor-pointer transition-all border-2",
                  selectedTemplate === template.code
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border dark:border-border hover:border-primary/50"
                )}
                onClick={() => onTemplateChange(template.code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground dark:text-white">
                        {template.name}
                      </h4>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate === template.code && (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="secondary"
                        className="text-[10px] bg-accent dark:bg-secondary"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  <Badge
                    variant="outline"
                    className="text-[10px] mt-3 border-primary/30 text-primary dark:text-primary"
                  >
                    Layout: {template.layout}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
