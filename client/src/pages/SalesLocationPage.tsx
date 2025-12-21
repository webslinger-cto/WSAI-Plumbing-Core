import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, Signal, BatteryMedium } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SalesLocationPageProps {
  salespersonId: string;
  fullName: string;
}

export default function SalesLocationPage({ salespersonId, fullName }: SalesLocationPageProps) {
  const { toast } = useToast();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
  } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const updateLocationMutation = useMutation({
    mutationFn: async (location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      speed?: number;
      heading?: number;
      altitude?: number;
    }) => {
      const res = await apiRequest("POST", `/api/salespersons/${salespersonId}/location`, location);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Location updated",
        description: "Your location has been recorded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Location update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location tracking.",
        variant: "destructive",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        };
        setCurrentLocation(loc);
        updateLocationMutation.mutate({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          altitude: position.coords.altitude || undefined,
        });
      },
      (error) => {
        toast({
          title: "Location error",
          description: error.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000,
      }
    );
    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const sendSingleLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location tracking.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp),
        };
        setCurrentLocation(loc);
        updateLocationMutation.mutate({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
        });
      },
      (error) => {
        toast({
          title: "Location error",
          description: error.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-location-title">Location Tracking</h1>
        <p className="text-muted-foreground">Share your location for dispatch coordination</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracking Status</CardTitle>
            <Signal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isTracking ? (
                <Badge variant="default" className="bg-green-600" data-testid="badge-tracking-active">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" data-testid="badge-tracking-inactive">
                  Inactive
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {isTracking ? "Location updates every 30 seconds" : "Start tracking to share location"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {currentLocation ? (
              <div className="space-y-1">
                <p className="text-sm font-mono" data-testid="text-coordinates">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Accuracy: {currentLocation.accuracy.toFixed(0)}m
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No location data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Location Controls</CardTitle>
          <CardDescription>
            Enable continuous tracking for automatic updates or send a single location ping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {isTracking ? (
              <Button onClick={stopTracking} variant="destructive" data-testid="button-stop-tracking">
                <Navigation className="mr-2 h-4 w-4" />
                Stop Tracking
              </Button>
            ) : (
              <Button onClick={startTracking} data-testid="button-start-tracking">
                <Navigation className="mr-2 h-4 w-4" />
                Start Continuous Tracking
              </Button>
            )}
            <Button
              onClick={sendSingleLocation}
              variant="outline"
              disabled={updateLocationMutation.isPending}
              data-testid="button-send-location"
            >
              {updateLocationMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Send Current Location
            </Button>
          </div>

          <div className="rounded-md bg-muted p-4">
            <h4 className="text-sm font-medium mb-2">Why share your location?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Helps dispatchers assign nearby leads to you</li>
              <li>Enables accurate arrival time estimates for customers</li>
              <li>Improves route optimization for multiple appointments</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
