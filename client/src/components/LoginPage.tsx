import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import cseLogo from "@assets/cse-logo.png";
import { YELP_REVIEW_URL } from "@/App";

const HOMEADVISOR_REVIEW_URL = "https://www.homeadvisor.com/rated.ChicagoSewerExperts.65557541.html";
const ANGI_REVIEW_URL = "https://www.angi.com/companylist/us/il/chicago/chicago-sewer-experts-reviews-1.htm?msockid=24bb858d5e4a60e506b093dc5f346117";
const BIRDEYE_REVIEW_URL = "https://reviews.birdeye.com/chicago-sewer-experts-166536711725103";

interface LoginResponse {
  id: string;
  username: string;
  role: "admin" | "dispatcher" | "technician";
  fullName: string | null;
  technicianId: string | null;
}

interface LoginPageProps {
  onLogin: (loginData: LoginResponse) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      const loginData: LoginResponse = await response.json();
      onLogin(loginData);
    } catch (err) {
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 marble-bg relative">
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute top-4 left-4 flex flex-col items-center gap-0.5 z-10">
        <span className="text-[10px] font-bold text-primary">HomeAdvisor</span>
        <div className="bg-white p-1 rounded-md">
          <QRCodeSVG
            value={HOMEADVISOR_REVIEW_URL}
            size={48}
            level="H"
            includeMargin={false}
            data-testid="qr-login-homeadvisor-review"
          />
        </div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col items-center gap-0.5 z-10">
        <span className="text-[10px] font-bold text-primary">Yelp</span>
        <div className="bg-white p-1 rounded-md">
          <QRCodeSVG
            value={YELP_REVIEW_URL}
            size={48}
            level="H"
            includeMargin={false}
            data-testid="qr-login-yelp-review"
          />
        </div>
      </div>
      <div className="absolute bottom-4 left-4 flex flex-col items-center gap-0.5 z-10">
        <span className="text-[10px] font-bold text-primary">Angi</span>
        <div className="bg-white p-1 rounded-md">
          <QRCodeSVG
            value={ANGI_REVIEW_URL}
            size={48}
            level="H"
            includeMargin={false}
            data-testid="qr-login-angi-review"
          />
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col items-center gap-0.5 z-10">
        <span className="text-[10px] font-bold text-primary">Birdeye</span>
        <div className="bg-white p-1 rounded-md">
          <QRCodeSVG
            value={BIRDEYE_REVIEW_URL}
            size={48}
            level="H"
            includeMargin={false}
            data-testid="qr-login-birdeye-review"
          />
        </div>
      </div>
      <Card className="w-full max-w-md z-10">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
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
              data-testid="button-signin"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
