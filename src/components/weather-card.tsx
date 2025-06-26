import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface WeatherCardProps {
  city: string;
  temperature: string;
  condition: string;
}

export default function WeatherCard({ city, temperature, condition }: WeatherCardProps) {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Weather for {city}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold">{temperature}</p>
        <p className="text-muted-foreground">{condition}</p>
      </CardContent>
    </Card>
  );
}
