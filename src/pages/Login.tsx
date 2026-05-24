import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";

function getOAuthUrl() {
  const kimiAuthUrl = import.meta.env.VITE_KIMI_AUTH_URL;
  const appID = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", appID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-slate-800">
              Dental Clinic Manager
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-1">
              Dentist Portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white"
            size="lg"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
          >
            Sign in to Continue
          </Button>
          <p className="text-center text-xs text-slate-400 mt-4">
            Authorized dentist access only
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
