import { Check, ChevronDown, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { Fragment, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useWindowStore } from '@/window-store'
import { Dialogs } from '@wailsio/runtime'
import {
  GrpcmdService,
  ProtoService,
} from '../../bindings/github.com/grpcmd/grpcmd-gui'

type Option = {
  value: string
  label: string
}

export default function SelectMethod() {
  const protoPaths = useWindowStore.use.protoPaths()
  const protoFiles = useWindowStore.use.protoFiles()
  const addProtoFiles = useWindowStore.use.addProtoFiles()
  const deleteProtoFiles = useWindowStore.use.deleteProtoFiles()
  const activeRequestId = useWindowStore.use.activeRequestId()
  const requests = useWindowStore.use.requests()
  // TODO: Try to get the activeRequest from the store as shallow.
  const updateActiveRequest = useWindowStore.use.updateActiveRequest()

  const activeRequest = requests[activeRequestId]
  const { address, method } = activeRequest

  const [open, setOpen] = useState<boolean>(false)
  const [options, setOptions] = useState<Option[]>([])
  const [protoFileOptions, setProtoFileOptions] = useState<{
    [protoFile: string]: Option[]
  }>({})
  const [loading, setLoading] = useState(false)

  const fetchMethods = async () => {
    setLoading(true)
    try {
      const response = await GrpcmdService.NonambiguousMethods(address)
      setOptions(
        response.map((v: string) => ({
          value: v,
          label: v,
        })),
      )
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
  }, [address])

  const handleAddProtoFile = async () => {
    const result = (await Dialogs.OpenFile({
      AllowsMultipleSelection: true,
      Filters: [
        {
          DisplayName: 'Protocol Buffer Files',
          Pattern: '*.proto',
        },
      ],
      CanChooseDirectories: false,
      CanChooseFiles: true,
      ButtonText: 'Add',
    })) as string[] | null
    if (result === null || result.length === 0) {
      return
    }

    addProtoFiles(result)
  }

  const handleDeleteProtoFile = (protoFile: string) => {
    deleteProtoFiles([protoFile])
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: Refresh on activeRequest change to keep up to date; Don't refresh on protoFileOptions to prevent infinte loop.
  useEffect(() => {
    async function fetchMethodsFromProtoFiles() {
      // TODO: Fire these request in parallel.
      for (const protoFile of protoFiles) {
        try {
          const response = await ProtoService.GetMethodsFromProtoFiles(
            protoPaths,
            [protoFile],
          )
          setProtoFileOptions({
            ...protoFileOptions,
            [protoFile]: response.map((v: string) => ({
              value: v,
              label: v,
            })),
          })
        } catch { }
      }
    }

    setProtoFileOptions({})
    fetchMethodsFromProtoFiles()
  }, [activeRequest, protoFiles, protoPaths]) // TODO: Consider providing a refresh button in the UI and removing activeRequest from here.

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="input-method"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-background px-3 font-normal outline-offset-0 hover:bg-background focus-visible:border-ring focus-visible:outline-[3px] focus-visible:outline-ring/20"
        >
          <span
            className={cn('truncate', !method && 'text-muted-foreground')}
            style={{ direction: 'rtl' }}
          >
            {method ? method : 'Select method'}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground/80"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
        align="start"
      >
        <Command>
          {/* ✅ 搜索框 + 刷新按钮 */}
          <div className="flex items-center px-2 py-1.5">
            <CommandInput
              placeholder="Search methods..."
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              title="Refresh methods"
              onClick={fetchMethods}
              disabled={loading}
              className="ml-1 shrink-0"
            >
              <RefreshCcw
                size={18}
                className={cn(
                  'text-muted-foreground transition-colors',
                  loading && 'animate-spin text-foreground'
                )}
              />
            </Button>
          </div>

          <CommandList>
            <CommandEmpty>No methods found.</CommandEmpty>

            {/* Reflection methods */}
            <CommandGroup heading="Reflection">
              {options.map((options) => (
                <CommandItem
                  key={`Reflection${options.value}`}
                  value={options.value}
                  onSelect={(currentValue) => {
                    updateActiveRequest({
                      method: currentValue === method ? '' : currentValue,
                      methodSource: currentValue === method ? '' : '',
                    })
                    setOpen(false)
                  }}
                >
                  {options.label}
                  {method === options.value && (
                    <Check size={16} strokeWidth={2} className="ml-auto" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Proto files methods */}
            {protoFiles.map((protoFile) => (
              <Fragment key={protoFile}>
                <CommandSeparator />
                <CommandGroup>
                  <div
                    cmdk-group-heading="true"
                    className="flex items-center justify-between"
                  >
                    {protoFile.substring(protoFile.lastIndexOf('/') + 1)}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => handleDeleteProtoFile(protoFile)}
                      className="h-[20px] w-5 p-0"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {protoFileOptions[protoFile] ? (
                    protoFileOptions[protoFile].map((options) => (
                      <CommandItem
                        key={protoFile + options.value}
                        value={options.value}
                        onSelect={(currentValue) => {
                          updateActiveRequest({
                            method:
                              currentValue === method ? '' : currentValue,
                            methodSource:
                              currentValue === method ? '' : protoFile,
                          })
                          setOpen(false)
                        }}
                      >
                        {options.label}
                        {method === options.value && (
                          <Check
                            size={16}
                            strokeWidth={2}
                            className="ml-auto"
                          />
                        )}
                      </CommandItem>
                    ))
                  ) : (
                    <CommandEmpty>No methods found.</CommandEmpty>
                  )}
                </CommandGroup>
              </Fragment>
            ))}

            <CommandSeparator />
            <CommandGroup>
              <Button
                variant="ghost"
                className="w-full justify-start font-normal"
                onClick={handleAddProtoFile}
              >
                <Plus
                  size={16}
                  strokeWidth={2}
                  className="-ms-2 me-2 opacity-60"
                />
                Import from a .proto file
              </Button>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
