'use client';

import { useState, useEffect } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getSettings } from '@/actions/settings/get-settings';
import { updateSettings } from '@/actions/settings/update-settings';
import { IconLoader2 } from '@tabler/icons-react';

interface SettingsData {
  // Meta Tags
  siteTitle: string;
  siteDescription: string;
  siteKeywords: string;
  ogImage: string;
  
  // Social Media
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  
  // Contact Information
  companyName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Business Hours
  businessHours: string;
  
  // Additional
  googleMapsUrl: string;
  whatsappNumber: string;
  footerText: string;
  
  // Index signature
  [key: string]: string;
}

export default function SettingsPage() {
  const { isLoading: permissionLoading, hasPermission } = usePermission('setting', 'read');
  const [settings, setSettings] = useState<SettingsData>({
    siteTitle: '',
    siteDescription: '',
    siteKeywords: '',
    ogImage: '',
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    businessHours: '',
    googleMapsUrl: '',
    whatsappNumber: '',
    footerText: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permissionLoading && hasPermission) {
      loadSettings();
    }
  }, [permissionLoading, hasPermission]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const result = await getSettings();
      if (result.success && result.data) {
        setSettings((prev) => ({ ...prev, ...result.data }));
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: keyof SettingsData, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const result = await updateSettings(settings);
      if (result.success) {
        toast.success('Settings saved successfully');
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (permissionLoading || loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-center h-96">
          <IconLoader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Breadcrumb */}
          <div className="px-4 lg:px-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Settings</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              {/* Header and Content */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage your application settings and configurations
                    </p>
                  </div>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>

                {/* Settings Tabs */}
                <Tabs defaultValue="meta" className="space-y-4">
            <TabsList>
              <TabsTrigger value="meta">Meta Tags</TabsTrigger>
              <TabsTrigger value="social">Social Media</TabsTrigger>
              <TabsTrigger value="contact">Contact Info</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            {/* Meta Tags Tab */}
            <TabsContent value="meta" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>SEO & Meta Tags</CardTitle>
                  <CardDescription>
                    Configure your website&apos;s meta information for search engines and social sharing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteTitle">Site Title</Label>
                    <Input
                      id="siteTitle"
                      value={settings.siteTitle}
                      onChange={(e) => handleInputChange('siteTitle', e.target.value)}
                      placeholder="Enter your site title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={settings.siteDescription}
                      onChange={(e) => handleInputChange('siteDescription', e.target.value)}
                      placeholder="Enter your site description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteKeywords">Keywords (comma-separated)</Label>
                    <Input
                      id="siteKeywords"
                      value={settings.siteKeywords}
                      onChange={(e) => handleInputChange('siteKeywords', e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ogImage">Open Graph Image URL</Label>
                    <Input
                      id="ogImage"
                      value={settings.ogImage}
                      onChange={(e) => handleInputChange('ogImage', e.target.value)}
                      placeholder="https://example.com/og-image.jpg"
                    />
                    <p className="text-sm text-muted-foreground">
                      Image displayed when sharing on social media (recommended: 1200x630px)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Media Tab */}
            <TabsContent value="social" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>
                    Add your social media profile URLs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <Input
                        id="facebook"
                        value={settings.facebook}
                        onChange={(e) => handleInputChange('facebook', e.target.value)}
                        placeholder="https://facebook.com/yourpage"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter/X</Label>
                      <Input
                        id="twitter"
                        value={settings.twitter}
                        onChange={(e) => handleInputChange('twitter', e.target.value)}
                        placeholder="https://twitter.com/yourhandle"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <Input
                        id="instagram"
                        value={settings.instagram}
                        onChange={(e) => handleInputChange('instagram', e.target.value)}
                        placeholder="https://instagram.com/yourhandle"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <Input
                        id="linkedin"
                        value={settings.linkedin}
                        onChange={(e) => handleInputChange('linkedin', e.target.value)}
                        placeholder="https://linkedin.com/company/yourcompany"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="youtube">YouTube</Label>
                      <Input
                        id="youtube"
                        value={settings.youtube}
                        onChange={(e) => handleInputChange('youtube', e.target.value)}
                        placeholder="https://youtube.com/@yourchannel"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiktok">TikTok</Label>
                      <Input
                        id="tiktok"
                        value={settings.tiktok}
                        onChange={(e) => handleInputChange('tiktok', e.target.value)}
                        placeholder="https://tiktok.com/@yourhandle"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Information Tab */}
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Manage your business contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={settings.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="contact@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={settings.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={settings.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={settings.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="City"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State/Province</Label>
                      <Input
                        id="state"
                        value={settings.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="State"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                      <Input
                        id="zipCode"
                        value={settings.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        placeholder="12345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={settings.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        placeholder="Country"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessHours">Business Hours</Label>
                    <Textarea
                      id="businessHours"
                      value={settings.businessHours}
                      onChange={(e) => handleInputChange('businessHours', e.target.value)}
                      placeholder="Monday - Friday: 9:00 AM - 5:00 PM&#10;Saturday: 10:00 AM - 3:00 PM&#10;Sunday: Closed"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Additional Settings Tab */}
            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Settings</CardTitle>
                  <CardDescription>
                    Configure additional website settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="googleMapsUrl">Google Maps Embed URL</Label>
                    <Input
                      id="googleMapsUrl"
                      value={settings.googleMapsUrl}
                      onChange={(e) => handleInputChange('googleMapsUrl', e.target.value)}
                      placeholder="https://www.google.com/maps/embed?pb=..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Get the embed URL from Google Maps by clicking Share → Embed a map
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input
                      id="whatsappNumber"
                      value={settings.whatsappNumber}
                      onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                      placeholder="+1234567890"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter number with country code (no spaces or special characters)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footerText">Footer Copyright Text</Label>
                    <Textarea
                      id="footerText"
                      value={settings.footerText}
                      onChange={(e) => handleInputChange('footerText', e.target.value)}
                      placeholder="© 2024 Your Company. All rights reserved."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
                </Tabs>

                {/* Bottom Save Button */}
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
