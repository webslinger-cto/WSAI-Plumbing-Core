import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import cseLogo from "@assets/cse-logo.png";
import { YELP_REVIEW_URL } from "@/App";

interface LoginPageProps {
  onLogin: (role: "admin" | "dispatcher" | "technician", username: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [role, setRole] = useState<"admin" | "dispatcher" | "technician">("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    
    // todo: remove mock functionality - replace with actual auth
    setTimeout(() => {
      if (password === "demo123") {
        onLogin(role, username);
      } else {
        setError("Invalid credentials. Try password: demo123");
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/30 relative">
      <div className="absolute top-4 right-4 bg-white p-1.5 rounded-md">
        <QRCodeSVG
          value={YELP_REVIEW_URL}
          size={64}
          level="H"
          includeMargin={false}
          data-testid="qr-login-yelp-review"
        />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto">
            <img 
              src={cseLogo} 
              alt="Chicago Sewer Experts" 
              className="h-24 w-auto mx-auto"
              data-testid="img-cse-logo"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide uppercase" data-testid="text-brand-title">
              CRM Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" />
              <span>(708) 398-7600</span>
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={role === "admin" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setRole("admin")}
              data-testid="button-role-admin"
            >
              Admin
            </Button>
            <Button
              type="button"
              variant={role === "dispatcher" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setRole("dispatcher")}
              data-testid="button-role-dispatcher"
            >
              Dispatch
            </Button>
            <Button
              type="button"
              variant={role === "technician" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => setRole("technician")}
              data-testid="button-role-technician"
            >
              Tech
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder={role === "admin" ? "admin" : role === "dispatcher" ? "dispatcher" : "tech_name"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : `Sign in as ${role === "admin" ? "Admin" : role === "dispatcher" ? "Dispatcher" : "Technician"}`}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Demo credentials: any username, password: demo123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
