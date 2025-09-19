import { useState, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchParties, Party } from "@/api/parties";

interface PartySelectProps {
    value?: string;
    onValueChange: (value: string, party: Party) => void;
    type: 'CONSIGNOR' | 'CONSIGNEE';
    placeholder?: string;
    disabled?: boolean;
    onAddNew?: () => void;
}

export function PartySelect({
    value,
    onValueChange,
    type,
    placeholder = "Select party...",
    disabled = false,
    onAddNew
}: PartySelectProps) {
    const [open, setOpen] = useState(false);
    const [parties, setParties] = useState<Party[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadParties = async () => {
            if (searchTerm.length < 2) {
                setParties([]);
                return;
            }

            setLoading(true);
            try {
                const data = await searchParties(searchTerm, type);
                setParties(data);
            } catch (error) {
                console.error('Error loading parties:', error);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(loadParties, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, type]);

    const selectedParty = parties.find(p => p.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {selectedParty ? selectedParty.name : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput
                        placeholder={`Search ${type.toLowerCase()}...`}
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>
                        <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                No {type.toLowerCase()} found.
                            </p>
                            {onAddNew && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setOpen(false);
                                        onAddNew();
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add New {type}
                                </Button>
                            )}
                        </div>
                    </CommandEmpty>
                    <CommandGroup>
                        {loading && (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        )}
                        {parties.map((party) => (
                            <CommandItem
                                key={party.id}
                                value={party.id}
                                onSelect={() => {
                                    onValueChange(party.id, party);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === party.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div className="flex-1">
                                    <div className="font-medium">{party.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {party.city}, {party.state} - {party.phone}
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}