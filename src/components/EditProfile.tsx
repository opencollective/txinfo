"use client";
import { useState, useEffect } from "react";
import { useNostr, useProfile } from "@/providers/NostrProvider";
import CopyableValue from "./CopyableValue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

interface Props {
  npub?: string;
}

export default function EditProfile({ npub }: Props) {
  const { profile } = useProfile();
  const [formData, setFormData] = useState({
    name: "",
    about: "",
    picture: "",
    website: "",
  });
  const { updateProfile } = useNostr();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  if (!npub) {
    npub = profile.npub;
  }

  // Update form when profile changes
  useEffect(() => {
    setFormData({
      name: profile.name || "",
      about: profile.about || "",
      picture: profile.picture || "",
      website: profile.website || "",
    });
  }, [profile]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasChanges) return;

    setIsSubmitting(true);
    setFeedback("");

    try {
      await updateProfile({
        name: formData.name,
        about: formData.about,
        picture: formData.picture,
        website: formData.website,
      });
      setFeedback("Profile updated successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setFeedback("Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateForm = (attr: string, value: string) => {
    setHasChanges(true);
    setFormData({ ...formData, [attr]: value });
  };

  const editable = npub === profile.npub;

  console.log("profile", profile);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>

      <form onSubmit={onSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Name</Label>
            <Input
              id="username"
              type="text"
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              name="username"
              autoComplete="username"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">About</Label>
            <Textarea
              id="about"
              value={formData.about}
              onChange={(e) => updateForm("about", e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          {/* Hidden password field for password managers */}
          <input
            type="password"
            name="password"
            className="hidden"
            readOnly
            autoComplete="current-password"
            value={window.localStorage.getItem("nostr_nsec") || ""}
          />

          {editable && (
            <div className="space-y-4">
              <CopyableValue
                label="Private Key (nsec)"
                value={window.localStorage.getItem("nostr_nsec") || ""}
                secret
              />
              <p className="text-sm text-muted-foreground">
                Your private key is stored locally in your browser. If you want
                to reuse the same profile, save this private key in a safe place
                (such as your password manager).
              </p>
            </div>
          )}

          {profile.npub && (
            <CopyableValue label="Public address (npub)" value={profile.npub} />
          )}
        </CardContent>

        {editable && (
          <CardFooter className="">
            <Button type="submit" disabled={!hasChanges || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        )}
      </form>

      {feedback && (
        <div
          className={`mt-4 p-2 rounded ${
            feedback.includes("Failed")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {feedback}
        </div>
      )}
    </Card>
  );
}
