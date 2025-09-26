// pages/LRTemplateSettings.tsx (NEW FILE)
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Edit, Eye, RefreshCw } from 'lucide-react';
import { checkTemplateStatus, getAvailableTemplates, updateTemplate } from '@/api/lr-templates';
import { LRTemplateOnboarding } from '@/components/LRTemplateOnboarding';
import { useToast } from '@/hooks/use-toast';

export const LRTemplateSettings = () => {
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadCurrentTemplate();
    }, []);

    const loadCurrentTemplate = async () => {
        try {
            const { hasTemplate, template } = await checkTemplateStatus();
            setCurrentTemplate(hasTemplate ? template : null);
        } catch (error) {
            console.error('Error loading template:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangeTemplate = () => {
        setShowOnboarding(true);
    };

    const handleTemplateUpdated = () => {
        setShowOnboarding(false);
        loadCurrentTemplate();
        toast({
            title: "Template Updated",
            description: "Your LR template has been updated successfully",
        });
    };

    if (showOnboarding) {
        return <LRTemplateOnboarding onComplete={handleTemplateUpdated} />;
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">LR Template Settings</h1>
                    <p className="text-muted-foreground">Manage your Lorry Receipt template configuration</p>
                </div>
            </div>

            {currentTemplate ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Current Template Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-medium mb-3">Template Details</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Template:</span>
                                        <Badge variant="default">{currentTemplate.template_name}</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Primary Color:</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded border"
                                                style={{ backgroundColor: currentTemplate.style_config?.primary_color }}
                                            ></div>
                                            <span className="text-sm">{currentTemplate.style_config?.primary_color}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Font Family:</span>
                                        <span>{currentTemplate.style_config?.font_family}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Show Logo:</span>
                                        <Badge variant={currentTemplate.header_config?.show_logo ? "default" : "secondary"}>
                                            {currentTemplate.header_config?.show_logo ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium mb-3">Header Configuration</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Logo Position:</span>
                                        <span className="capitalize">{currentTemplate.header_config?.logo_position}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Company Name Size:</span>
                                        <span>{currentTemplate.header_config?.company_name_size}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Show GST:</span>
                                        <Badge variant={currentTemplate.header_config?.show_gst ? "default" : "secondary"}>
                                            {currentTemplate.header_config?.show_gst ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-medium mb-3">Footer Configuration</h3>
                            <div className="space-y-2">
                                <div>
                                    <span className="text-gray-600">Terms & Conditions:</span>
                                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                                        {currentTemplate.footer_config?.terms_text}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Signature Labels:</span>
                                    <div className="flex gap-2 mt-1">
                                        {currentTemplate.footer_config?.signature_labels?.map((label, index) => (
                                            <Badge key={index} variant="outline">{label}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t">
                            <Button onClick={handleChangeTemplate} className="flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                Change Template
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                Preview Current
                            </Button>
                            <Button variant="outline" onClick={loadCurrentTemplate} className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Reload
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="text-center py-12">
                        <h3 className="text-lg font-medium mb-2">No Template Configured</h3>
                        <p className="text-gray-600 mb-4">Set up your LR template to get started</p>
                        <Button onClick={handleChangeTemplate}>
                            Configure Template
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};