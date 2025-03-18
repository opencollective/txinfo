"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import chains from "../chains.json";
import { ExternalLink, Edit } from "lucide-react";
import CopyableValue from "./CopyableValue";
import { Tag } from "@/components/ui/tag";
import { useNostr } from "@/providers/NostrProvider";

import EditMetadataForm from "@/components/EditMetadataForm";
import { getENSNameFromAddress } from "@/utils/crypto.server";
import { generateURI } from "@/lib/utils";
import type { URI, Address } from "@/types";
export default function AddressDetails({
  chain,
  address,
}: {
  chain: string;
  address: Address;
}) {
  const chainConfig = chains[chain as keyof typeof chains];
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notesByURI, subscribeToNotesByURI } = useNostr();
  const uri = generateURI("ethereum", { chainId: chainConfig.id, address });
  subscribeToNotesByURI([uri]);
  const latestNote = notesByURI[uri as URI]?.[0];
  const [addressName, setAddressName] = useState(
    latestNote?.content || "Unknown address"
  );

  useEffect(() => {
    const latestNote = notesByURI[uri as URI]?.[0];
    if (latestNote?.content) {
      setAddressName(latestNote.content);
      return;
    }
    const fetchENSName = async () => {
      const ensName = await getENSNameFromAddress(address);
      console.log(">>> fetchENSName", address, ensName);
      setAddressName(ensName || "Unknown address");
    };
    fetchENSName();
  }, [address, addressName, notesByURI, uri]);

  if (!chainConfig) {
    return <div>Chain not found</div>;
  }

  const onCancelEditing = () => {
    setIsEditing(false);
  };

  const tags =
    latestNote?.tags.filter((t) => t[0] === "t").map((tag) => `#${tag[1]}`) ||
    [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-start justify-between">
          <div className="flex flex-col">
            {isEditing ? (
              <div className="space-y-2">
                <EditMetadataForm
                  uri={uri}
                  content={latestNote?.content}
                  tags={latestNote?.tags}
                  inputRef={inputRef}
                  onCancel={onCancelEditing}
                />
              </div>
            ) : (
              <div className="group relative flex flex-row items-center">
                <span className="pr-2">{addressName}</span>
                {!isEditing && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 my-2">
                    {tags.map((tag) => (
                      <Tag key={tag} value={tag} />
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsEditing(true);

                    // Focus the input when entering edit mode
                    setTimeout(() => {
                      inputRef.current?.select();
                    }, 0);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
            <div className="flex flex-row items-center">
              <CopyableValue
                value={address}
                className="text-xs bg-transparent"
                truncate
              />
              <a
                href={`${chainConfig?.explorer_url}/address/${address}`}
                target="_blank"
                title={`View on ${chainConfig?.explorer_name}`}
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6"></CardContent>
    </Card>
  );
}
