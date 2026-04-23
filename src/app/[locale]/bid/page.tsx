'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { uploadSlotImage } from '@/lib/upload/uploadSlotImage';
import { createBidCheckoutSession } from '@/app/actions/bid';
import { isBillboardFrozen } from '@/lib/freeze/checkFrozen';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ImageUpload } from '@/components/bid/ImageUpload';
import { ImagePositioner } from '@/components/bid/ImagePositioner';

type Step = 'image' | 'amount' | 'position' | 'confirm';

type SlotInfo = {
  id: string;
  display_name: string;
  current_bid_eur: number;
  current_owner_id: string | null;
};

export default function BidPage({
  searchParams,
}: {
  searchParams: Promise<{ outbid?: string }>;
}) {
  const t = useTranslations('bid');
  const tValidation = useTranslations('bid.validation');
  const tErrors = useTranslations('bid.errors');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>('image');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [outbidSlotId, setOutbidSlotId] = useState<string | null>(null);

  // Store uploaded image URL for layout picker
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Calculate minimum bid based on mode (5 EUR increments)
  const minBid = slotInfo ? Math.ceil((slotInfo.current_bid_eur + 0.01) / 5) * 5 : 5;

  // Create form schema with dynamic minBid and 5 EUR increment validation
  const bidFormSchema = z.object({
    image: z
      .instanceof(File)
      .optional()
      .refine(
        (file) => !file || file.size <= config.maxImageSizeMb * 1024 * 1024,
        tValidation('imageTooBig')
      )
      .refine(
        (file) => !file || config.allowedImageTypes.includes(file.type as typeof config.allowedImageTypes[number]),
        tValidation('imageInvalidType')
      ),
    bid_eur: z
      .number()
      .min(minBid, `Minimum bid is €${minBid}`)
      .refine((val) => val % 5 === 0, 'Bid must be in 5 EUR increments (€5, €10, €15, ...)'),
    pan_x: z.number().min(0).max(1),
    pan_y: z.number().min(0).max(1),
    zoom: z.number().min(1.0).max(3.0),
    display_name: z
      .string()
      .min(1, tValidation('displayNameRequired'))
      .max(50, tValidation('displayNameTooLong')),
    link_url: z
      .string()
      .url(tValidation('linkInvalid'))
      .startsWith('https://', tValidation('linkInvalid')),
  });

  type BidFormValues = z.infer<typeof bidFormSchema>;

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      bid_eur: minBid,
      pan_x: 0.5,
      pan_y: 0.5,
      zoom: 1.0,
      display_name: '',
      link_url: '',
    },
    mode: 'onChange',
  });

  // Check authentication and load slot info
  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setIsAuthenticated(true);
      setUserId(user.id);

      const params = await searchParams;
      const outbidParam = params.outbid;

      if (outbidParam) {
        setOutbidSlotId(outbidParam);
        const { data, error: slotError } = await supabase
          .from('slots')
          .select('id, display_name, current_bid_eur, current_owner_id')
          .eq('id', outbidParam)
          .eq('status', 'active')
          .maybeSingle();

        if (slotError || !data) {
          setError(tErrors('slotNotFound'));
          return;
        }

        const slot = data as unknown as SlotInfo;

        if (slot.current_owner_id === user.id) {
          setError('You cannot outbid your own slot');
          return;
        }

        setSlotInfo(slot);
        const newMinBid = Math.ceil((slot.current_bid_eur + 0.01) / 5) * 5;
        form.setValue('bid_eur', newMinBid);
      }
    }

    init();
  }, [searchParams, router, tErrors, form]);

  const steps: Step[] = ['image', 'amount', 'position', 'confirm'];
  const currentStepIndex = steps.indexOf(currentStep);

  const canProceedToNext = () => {
    const values = form.getValues();

    switch (currentStep) {
      case 'image':
        return !!values.image;
      case 'amount':
        const bid = values.bid_eur;
        return bid >= minBid && bid % 5 === 0;
      case 'position':
        return values.zoom >= 1 && values.zoom <= 3;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      // If moving from image to amount, upload the image
      if (currentStep === 'image' && !uploadedImageUrl) {
        const imageFile = form.getValues('image');
        if (imageFile && userId) {
          setIsUploadingImage(true);
          try {
            const url = await uploadSlotImage(imageFile, userId);
            setUploadedImageUrl(url);
          } catch (err) {
            console.error('Upload failed:', err);
            toast.error('Failed to upload image');
            setIsUploadingImage(false);
            return;
          }
          setIsUploadingImage(false);
        }
      }

      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const onSubmit = async (values: BidFormValues) => {
    if (!userId || !uploadedImageUrl) {
      setError(tErrors('unauthorized'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createBidCheckoutSession({
        display_name: values.display_name,
        image_url: uploadedImageUrl,
        link_url: values.link_url,
        // brand_color column is deprecated in UI; send a neutral value that
        // satisfies the server-side validator until the migration drops it.
        brand_color: '#1a1a1a',
        bid_eur: values.bid_eur,
        // Treemap rendering ignores layout_width / layout_height; server
        // still validates `width * height === round(bid_eur)`, so send a
        // trivial 1 × bid strip until the migration drops the column.
        layout_width: Math.round(values.bid_eur),
        layout_height: 1,
        pan_x: values.pan_x,
        pan_y: values.pan_y,
        zoom: values.zoom,
        outbid_slot_id: outbidSlotId || undefined,
      });

      if (!result.success) {
        const errorMsg = result.error || tErrors('sessionFailed');
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        const errorMsg = tErrors('sessionFailed');
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      const errorMsg = err instanceof Error ? err.message : tErrors('sessionFailed');
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  const frozen = isBillboardFrozen();
  if (frozen) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl">{t('frozen.title')}</CardTitle>
            <CardDescription>{t('frozen.message')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/">
              <Button className="w-full">{t('frozen.backToBoard')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <Card className="border-2">
        <CardHeader className="pb-3 pt-4">
          {/* Terminal-style header */}
          <CardTitle className="text-xl font-mono flex items-center gap-2">
            <span className="text-primary">$</span>
            <span>place_bid</span>
            <span className="text-sm text-muted-foreground ml-auto">[esc]</span>
          </CardTitle>

          {/* Step indicators */}
          <div className="flex gap-3 mt-3 text-sm font-mono">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step} className="flex items-center gap-2">
                  {isPast && <Check className="w-3 h-3 text-primary" />}
                  {isCurrent && <span className="text-primary">●</span>}
                  <span className={isCurrent ? 'text-primary' : isPast ? 'text-foreground' : 'text-muted-foreground'}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Step 1: Image Upload */}
              {currentStep === 'image' && (
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-primary">&gt; upload image</FormLabel>
                      <FormControl>
                        <ImageUpload
                          value={value}
                          onChange={onChange}
                          disabled={isLoading || isUploadingImage}
                          maxSizeMB={config.maxImageSizeMb}
                        />
                      </FormControl>
                      <FormDescription className="text-xs font-mono">
                        required · PNG, JPEG, WEBP · max {config.maxImageSizeMb}MB
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Step 2: Amount */}
              {currentStep === 'amount' && (
                <FormField
                  control={form.control}
                  name="bid_eur"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-primary">&gt; set amount</FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                          €
                        </span>
                        <FormControl>
                          <Input
                            type="number"
                            step="5"
                            min={minBid}
                            className="pl-8 font-mono"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? '' : value);
                            }}
                          />
                        </FormControl>
                      </div>
                      <FormDescription className="text-xs font-mono">
                        minimum €{minBid} · increments of €5 only (€5, €10, €15, ...)
                        <br />
                        1 EUR = 1 pixel
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Step 3: Position image (focal point + zoom) */}
              {currentStep === 'position' && uploadedImageUrl && (
                <ImagePositioner
                  imageUrl={uploadedImageUrl}
                  pan={{ x: form.watch('pan_x'), y: form.watch('pan_y') }}
                  zoom={form.watch('zoom')}
                  onPanChange={(pan) => {
                    form.setValue('pan_x', pan.x);
                    form.setValue('pan_y', pan.y);
                  }}
                  onZoomChange={(zoom) => form.setValue('zoom', zoom)}
                  disabled={isLoading}
                />
              )}

              {/* Step 4: Confirm - Rest of fields */}
              {currentStep === 'confirm' && (
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono">display name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Brand" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="link_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono">link URL</FormLabel>
                        <FormControl>
                          <Input type="url" placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 pt-2">
                {currentStepIndex > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isLoading || isUploadingImage}
                    className="font-mono"
                  >
                    ← back
                  </Button>
                )}

                {currentStepIndex < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNext() || isLoading || isUploadingImage}
                    className="ml-auto font-mono"
                  >
                    {isUploadingImage ? 'uploading...' : 'continue →'}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || isUploadingImage}
                    className="ml-auto font-mono"
                  >
                    {isLoading ? 'processing...' : '[confirm bid →]'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
