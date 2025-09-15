
import { useState } from "react";
import { BellRing, CreditCard, Globe, Link, ShieldCheck, Moon, Sun, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("general");
  
  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header />
      
      <div className="flex-1 px-4 py-8 md:px-6 lg:px-8 max-w-screen-lg mx-auto w-full">
        <h1 className="text-2xl md:text-3xl font-serif mb-8">Settings</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-background/50 p-1 h-auto flex flex-wrap">
            <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-secondary/70">
              <ToggleLeft className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-secondary/70">
              <BellRing className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-secondary/70">
              <CreditCard className="h-4 w-4" />
              <span>Subscription & Billing</span>
            </TabsTrigger>
            <TabsTrigger value="connected" className="gap-2 data-[state=active]:bg-secondary/70">
              <Link className="h-4 w-4" />
              <span>Connected Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2 data-[state=active]:bg-secondary/70">
              <ShieldCheck className="h-4 w-4" />
              <span>Data & Privacy</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Application Preferences</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Language</Label>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred language for the application interface
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Globe className="h-4 w-4" />
                      <span>English (US)</span>
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose between light and dark theme
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="bg-background border-primary/20">
                      <Sun className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Moon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Default View</Label>
                    <p className="text-sm text-muted-foreground">
                      Select what you see when first opening a subject
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">Overview</Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Notification Preferences</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Summaries</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly email summaries of your study progress
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Due Date Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when assignment due dates are approaching
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Study Recommendations</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive AI-powered suggestions for your study sessions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="billing" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Subscription Details</h2>
              
              <div className="rounded-md border p-6 bg-background/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Current Plan</h3>
                    <Button variant="outline" size="sm">Change Plan</Button>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-medium">Pro Plan</span>
                    <span className="text-muted-foreground">$9.99/month</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Your next billing date is May 16, 2025
                  </p>
                  
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Unlimited Subjects</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Advanced AI Tutor</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Priority Support</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <h3 className="text-lg font-medium mt-6">Payment Method</h3>
              <div className="flex items-center justify-between p-4 border rounded-md bg-background/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2026</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
              
              <h3 className="text-lg font-medium mt-6">Billing History</h3>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 text-sm grid grid-cols-3">
                  <div>Date</div>
                  <div>Amount</div>
                  <div className="text-right">Status</div>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 text-sm border-t">
                  <div>Apr 16, 2025</div>
                  <div>$9.99</div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                      Paid
                    </span>
                  </div>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 text-sm border-t">
                  <div>Mar 16, 2025</div>
                  <div>$9.99</div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                      Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="connected" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Connected Services</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-muted-foreground">
                        Connected for Calendar and Drive
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Disconnect</Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">
                        Not connected
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Connect</Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="privacy" className="space-y-6">
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Data & Privacy Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Usage Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow us to collect anonymous usage data to improve the application
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Study Data for AI</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow AI to use your study data for personalized recommendations
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <Label className="text-base">Your Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Export or delete all your data from our systems
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">
                      Export Data
                    </Button>
                    <Button variant="destructive" size="sm">
                      Delete All Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Spark.E © 2025 • Your AI-Powered Study Partner</p>
      </footer>
    </div>
  );
};

export default Settings;
