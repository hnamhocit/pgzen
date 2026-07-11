import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DatabaseIcon,
  PlugsConnectedIcon,
  ShieldCheckIcon,
  ShieldSlashIcon,
  ShieldIcon,
  LockKeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  FloppyDiskIcon,
} from "@phosphor-icons/react";
import { testConnection, saveConnection } from "@/lib/tauri";
import { useConnectionStore } from "@/store/useConnectionStore";
import { cn } from "@/lib/utils";

// ─── Schema ────────────────────────────────────────────────────────────────

const connectionSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535, "Invalid port"),
  database: z.string().min(1, "Database name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  sslMode: z.enum(["disable", "require", "verify-ca", "verify-full"]),
  applicationName: z.string().optional(),
  connectTimeout: z.number().optional(),
});

type ConnectionFormValues = z.infer<typeof connectionSchema>;

// ─── SSL Mode descriptions ──────────────────────────────────────────────────

const SSL_MODES = [
  {
    value: "disable",
    label: "Disable",
    description: "No SSL. Data sent in plaintext.",
    icon: ShieldSlashIcon,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  },
  {
    value: "require",
    label: "Require",
    description: "SSL required. Server cert not verified.",
    icon: ShieldIcon,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    value: "verify-ca",
    label: "Verify CA",
    description: "SSL + verify server cert signed by trusted CA.",
    icon: ShieldCheckIcon,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    value: "verify-full",
    label: "Verify Full",
    description: "SSL + verify CA + hostname must match.",
    icon: LockKeyIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
] as const;

// ─── Toast state ───────────────────────────────────────────────────────────

type ToastState = {
  type: "success" | "error" | "loading";
  message: string;
} | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm transition-all",
        toast.type === "success" &&
          "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300",
        toast.type === "error" &&
          "bg-destructive/10 border-destructive/20 text-destructive",
        toast.type === "loading" &&
          "bg-primary/10 border-primary/20 text-primary",
      )}
    >
      {toast.type === "success" && (
        <CheckCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
      )}
      {toast.type === "error" && (
        <XCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" />
      )}
      {toast.type === "loading" && (
        <CircleNotchIcon
          size={16}
          weight="bold"
          className="mt-0.5 shrink-0 animate-spin"
        />
      )}
      <span className="leading-tight">{toast.message}</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ConnectionDialog({
  children,
}: {
  children: React.ReactElement;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const { add } = useConnectionStore();

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      name: "",
      host: "localhost",
      port: 5432,
      database: "postgres",
      username: "postgres",
      password: "",
      sslMode: "disable",
      applicationName: "pgzen",
      connectTimeout: 10,
    },
  });

  const { errors } = form.formState;

  // Reset state khi dialog đóng/mở
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setTestPassed(false);
      setToast(null);
    }
    setIsOpen(open);
  };

  // ── Test Connection ──────────────────────────────────────────────────────

  const runTest = async (): Promise<boolean> => {
    const isValid = await form.trigger();
    if (!isValid) return false;

    setIsTesting(true);
    setToast({ type: "loading", message: "Testing connection…" });

    try {
      const data = form.getValues();
      const result = await testConnection({
        name: data.name,
        host: data.host,
        port: data.port,
        database: data.database,
        username: data.username,
        password: data.password || undefined,
        ssl_mode: data.sslMode,
        application_name: data.applicationName || undefined,
      });

      setTestPassed(true);
      setToast({ type: "success", message: result });
      return true;
    } catch (error: unknown) {
      setTestPassed(false);
      setToast({
        type: "error",
        message: typeof error === "string" ? error : "Connection failed",
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = () => runTest();

  // ── Connect (test → save → close) ────────────────────────────────────────

  const handleConnect = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsConnecting(true);

    try {
      // Test nếu chưa pass
      let passed = testPassed;
      if (!passed) {
        passed = await runTest();
        if (!passed) {
          setIsConnecting(false);
          return;
        }
      }

      // Save connection
      setToast({ type: "loading", message: "Saving connection…" });
      const data = form.getValues();

      const saved = await saveConnection(
        {
          id: "",
          name: data.name,
          host: data.host,
          port: data.port,
          database: data.database,
          username: data.username,
          ssl_mode: data.sslMode,
          application_name: data.applicationName || undefined,
        },
        data.password || undefined,
      );

      // Update sidebar state
      add(saved);
      setToast({
        type: "success",
        message: `"${saved.name}" connected & saved!`,
      });

      // Đóng dialog sau 800ms để user thấy toast
      setTimeout(() => {
        setIsOpen(false);
        form.reset();
        setTestPassed(false);
        setToast(null);
      }, 800);
    } catch (error: unknown) {
      setToast({
        type: "error",
        message:
          typeof error === "string" ? error : "Failed to save connection",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const isBusy = isTesting || isConnecting;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />

      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DatabaseIcon size={22} weight="fill" className="text-primary" />
            New Connection
          </DialogTitle>
          <DialogDescription>
            Configure your PostgreSQL connection parameters.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
          <Tabs defaultValue="general" className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 py-4 h-[360px] overflow-y-auto space-y-0">
              {/* ── TAB: GENERAL ──────────────────────────────────────── */}
              <TabsContent value="general" className="mt-0 outline-none">
                <FieldGroup>
                  {/* Connection Name */}
                  <Field>
                    <FieldLabel htmlFor="conn-name">Connection Name</FieldLabel>
                    <Input
                      id="conn-name"
                      placeholder="Production DB"
                      {...form.register("name")}
                      onChange={(e) => {
                        form.register("name").onChange(e);
                        setTestPassed(false); // reset test khi form thay đổi
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </Field>

                  {/* Host + Port */}
                  <div className="grid grid-cols-4 gap-3">
                    <Field className="col-span-3">
                      <FieldLabel htmlFor="conn-host">Host</FieldLabel>
                      <Input
                        id="conn-host"
                        className="font-mono text-sm"
                        placeholder="localhost"
                        {...form.register("host")}
                        onChange={(e) => {
                          form.register("host").onChange(e);
                          setTestPassed(false);
                        }}
                      />
                      {errors.host && (
                        <p className="text-xs text-destructive">
                          {errors.host.message}
                        </p>
                      )}
                    </Field>

                    <Field className="col-span-1">
                      <FieldLabel htmlFor="conn-port">Port</FieldLabel>
                      <Input
                        id="conn-port"
                        type="number"
                        className="font-mono text-sm"
                        {...form.register("port", { valueAsNumber: true })}
                        onChange={(e) => {
                          form.register("port", { valueAsNumber: true }).onChange(e);
                          setTestPassed(false);
                        }}
                      />
                      {errors.port && (
                        <p className="text-xs text-destructive">
                          {errors.port.message}
                        </p>
                      )}
                    </Field>
                  </div>

                  {/* Database */}
                  <Field>
                    <FieldLabel htmlFor="conn-db">Database</FieldLabel>
                    <Input
                      id="conn-db"
                      className="font-mono text-sm"
                      placeholder="postgres"
                      {...form.register("database")}
                      onChange={(e) => {
                        form.register("database").onChange(e);
                        setTestPassed(false);
                      }}
                    />
                    {errors.database && (
                      <p className="text-xs text-destructive">
                        {errors.database.message}
                      </p>
                    )}
                  </Field>

                  {/* Username + Password */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="conn-user">Username</FieldLabel>
                      <Input
                        id="conn-user"
                        className="font-mono text-sm"
                        placeholder="postgres"
                        {...form.register("username")}
                        onChange={(e) => {
                          form.register("username").onChange(e);
                          setTestPassed(false);
                        }}
                      />
                      {errors.username && (
                        <p className="text-xs text-destructive">
                          {errors.username.message}
                        </p>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="conn-pass">Password</FieldLabel>
                      <Input
                        id="conn-pass"
                        type="password"
                        className="font-mono text-sm"
                        placeholder="••••••••"
                        {...form.register("password")}
                        onChange={(e) => {
                          form.register("password").onChange(e);
                          setTestPassed(false);
                        }}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </TabsContent>

              {/* ── TAB: ADVANCED ─────────────────────────────────────── */}
              <TabsContent
                value="advanced"
                className="mt-0 outline-none space-y-6"
              >
                {/* SSL Mode */}
                <FieldSet>
                  <FieldLegend>Security</FieldLegend>
                  <FieldDescription>
                    How the connection is encrypted over the network.
                  </FieldDescription>

                  <Controller
                    control={form.control}
                    name="sslMode"
                    render={({ field }) => (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {SSL_MODES.map((mode) => {
                          const Icon = mode.icon;
                          const isSelected = field.value === mode.value;
                          return (
                            <button
                              key={mode.value}
                              type="button"
                              onClick={() => {
                                field.onChange(mode.value);
                                setTestPassed(false);
                              }}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer",
                                isSelected
                                  ? `${mode.bg} ring-1 ring-offset-1 ring-current`
                                  : "border-border hover:bg-accent/50",
                              )}
                            >
                              <Icon
                                size={18}
                                weight="fill"
                                className={cn(
                                  "mt-0.5 shrink-0",
                                  isSelected
                                    ? mode.color
                                    : "text-muted-foreground",
                                )}
                              />
                              <div>
                                <div
                                  className={cn(
                                    "text-sm font-medium leading-none mb-1",
                                    isSelected ? mode.color : "text-foreground",
                                  )}
                                >
                                  {mode.label}
                                </div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                  {mode.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </FieldSet>

                {/* Connection Options */}
                <FieldSet>
                  <FieldLegend>Connection Options</FieldLegend>

                  <FieldGroup>
                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="conn-timeout">
                          Connect Timeout (s)
                        </FieldLabel>
                        <Input
                          id="conn-timeout"
                          type="number"
                          className="font-mono text-sm"
                          min={1}
                          max={300}
                          {...form.register("connectTimeout", { valueAsNumber: true })}
                        />
                        <FieldDescription>
                          Seconds before giving up.
                        </FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="conn-app-name">
                          Application Name
                        </FieldLabel>
                        <Input
                          id="conn-app-name"
                          className="font-mono text-sm"
                          {...form.register("applicationName")}
                        />
                        <FieldDescription>
                          Visible in{" "}
                          <code className="font-mono text-[11px] bg-muted px-1 rounded">
                            pg_stat_activity
                          </code>
                          .
                        </FieldDescription>
                      </Field>
                    </div>
                  </FieldGroup>
                </FieldSet>

                {/* Info */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border">
                  <InfoIcon size={14} className="mt-0.5 shrink-0" />
                  <span>
                    Password is stored encrypted on your local machine. It never
                    leaves your device.
                  </span>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Toast area */}
          {toast && (
            <div className="px-6 pb-0">
              <Toast toast={toast} />
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-2">
            {/* Test result badge */}
            <div className="flex items-center gap-1.5 text-xs">
              {testPassed ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircleIcon size={14} weight="fill" />
                  Connection verified
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Test before connecting
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={handleTestConnection}
                disabled={isBusy}
                className="gap-2 shadow-none"
              >
                {isTesting ? (
                  <CircleNotchIcon
                    size={16}
                    weight="bold"
                    className="animate-spin"
                  />
                ) : testPassed ? (
                  <CheckCircleIcon
                    size={16}
                    weight="fill"
                    className="text-emerald-500"
                  />
                ) : (
                  <PlugsConnectedIcon size={16} />
                )}
                Test
              </Button>

              <Button
                type="button"
                size="lg"
                onClick={handleConnect}
                disabled={isBusy}
                className={cn(
                  "gap-2",
                  testPassed && "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                {isConnecting ? (
                  <CircleNotchIcon
                    size={16}
                    weight="bold"
                    className="animate-spin"
                  />
                ) : (
                  <FloppyDiskIcon size={16} weight="fill" />
                )}
                Connect
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
