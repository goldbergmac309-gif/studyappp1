
import { useState } from "react";
import { User, KeyRound, Mail, Camera, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Header />
      
      <div className="flex-1 px-4 py-8 md:px-6 lg:px-8 max-w-screen-lg mx-auto w-full">
        <h1 className="text-2xl md:text-3xl font-serif mb-8">Profile</h1>
        
        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarFallback className="text-xl font-medium">JS</AvatarFallback>
              <AvatarImage src="/placeholder.svg" alt="User avatar" />
            </Avatar>
            
            <div className="flex flex-col items-center sm:items-start gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Camera className="h-4 w-4" />
                <span>Change Photo</span>
              </Button>
              <p className="text-sm text-muted-foreground">
                Recommended: Square image, at least 400×400px
              </p>
            </div>
          </div>
          
          <Separator />
          
          {/* User Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-medium">Account Information</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 rounded-l-md border-input bg-secondary/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input 
                    id="name" 
                    placeholder="John Smith" 
                    className="rounded-l-none"
                    defaultValue="John Smith"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="flex">
                  <span className="flex items-center px-3 border border-r-0 rounded-l-md border-input bg-secondary/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@example.com" 
                    className="rounded-l-none bg-muted"
                    defaultValue="john@example.com"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button>Save Changes</Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Password Change */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Password</h2>
              {!isChangingPassword && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsChangingPassword(true)}
                >
                  Change Password
                </Button>
              )}
            </div>
            
            {isChangingPassword && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 rounded-l-md border-input bg-secondary/50">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <Input 
                      id="current-password" 
                      type="password" 
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsChangingPassword(false)}
                  >
                    Cancel
                  </Button>
                  <Button>Update Password</Button>
                </div>
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Account Deletion */}
          <div className="space-y-4 rounded-md border border-destructive/20 p-4 bg-destructive/5">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-medium text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. This action cannot be undone.
              </p>
            </div>
            
            <Button variant="destructive" size="sm" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Delete Account</span>
            </Button>
          </div>
        </div>
      </div>
      
      <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t border-border">
        <p>Spark.E © 2025 • Your AI-Powered Study Partner</p>
      </footer>
    </div>
  );
};

export default Profile;
