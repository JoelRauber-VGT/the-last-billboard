'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { config } from '@/lib/config';
import { uploadSlotImage } from '@/lib/upload/uploadSlotImage';
import { createBidCheckoutSession } from '@/app/actions/bid';
import { isBillboardFrozen } from '@/lib/freeze/checkFrozen';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { ImageUpload } from '@/components/bid/ImageUpload';
import { ColorPicker } from '@/components/bid/ColorPicker';

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
  const pathname = usePathname();

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [outbidSlotId, setOutbidSlotId] = useState<string | null>(null);

  // Calculate minimum bid based on mode
  const minBid = slotInfo ? slotInfo.current_bid_eur + 0.01 : config.minBidEur;

  // Create form schema with dynamic minBid
  const bidFormSchema = z.object({
    display_name: z
      .string()
      .min(1, tValidation('displayNameRequired'))
      .max(50, tValidation('displayNameTooLong')),
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
    link_url: z
      .string()
      .url(tValidation('linkInvalid'))
      .startsWith('https://', tValidation('linkInvalid')),
    brand_color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, tValidation('colorInvalid')),
    bid_eur: z
      .number()
      .min(minBid, tValidation('bidTooLow', { min: minBid.toFixed(2) }))
      .multipleOf(0.01, tValidation('bidInvalid')),
  });

  type BidFormValues = z.infer<typeof bidFormSchema>;

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      display_name: '',
      link_url: '',
      brand_color: '#888888',
      bid_eur: minBid,
    },
    mode: 'onChange',
  });

  // Check authentication and load slot info
  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login
        router.push('/login');
        return;
      }

      setIsAuthenticated(true);
      setUserId(user.id);

      // Get search params
      const params = await searchParams;
      const outbidParam = params.outbid;

      if (outbidParam) {
        setOutbidSlotId(outbidParam);
        // Fetch slot info
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

        // Check if user owns this slot
        if (slot.current_owner_id === user.id) {
          setError('You cannot outbid your own slot');
          return;
        }

        setSlotInfo(slot);
        // Update form with minimum bid
        form.setValue('bid_eur', slot.current_bid_eur + 0.01);
      }
    }

    init();
  }, [searchParams, router, tErrors, form]);

  // Handle form submission
  const onSubmit = async (values: BidFormValues) => {
    if (!userId) {
      setError(tErrors('unauthorized'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (values.image) {
        setIsUploadingImage(true);
        try {
          imageUrl = await uploadSlotImage(values.image, userId);
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          const errorMessage = tErrors('uploadFailed');
          setError(errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
          setIsUploadingImage(false);
          return;
        }
        setIsUploadingImage(false);
      }

      // Create checkout session
      const result = await createBidCheckoutSession({
        display_name: values.display_name,
        image_url: imageUrl,
        link_url: values.link_url,
        brand_color: values.brand_color,
        bid_eur: values.bid_eur,
        outbid_slot_id: outbidSlotId || undefined,
      });

      if (!result.success) {
        const errorMsg = result.error || tErrors('sessionFailed');
        console.error('Checkout session failed:', errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url;
      } else {
        const errorMsg = tErrors('sessionFailed');
        console.error('No checkout URL returned');
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
    return null; // Will redirect in useEffect
  }

  // Check if billboard is frozen
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
    <div className="mx-auto w-full max-w-2xl px-4">
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xl md:text-2xl">
            {slotInfo ? t('form.titleOutbid') : t('form.title')}
          </CardTitle>
          {slotInfo && (
            <CardDescription>
              {t('form.outbiddingInfo', {
                name: slotInfo.display_name,
                amount: slotInfo.current_bid_eur.toFixed(2),
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {error && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            {/* Display Name */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.displayName')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('form.displayNamePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <FormField
              control={form.control}
              name="image"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>{t('form.image')}</FormLabel>
                  <FormControl>
                    <ImageUpload
                      value={value}
                      onChange={onChange}
                      disabled={isLoading || isUploadingImage}
                      maxSizeMB={config.maxImageSizeMb}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">{t('form.imageHelp')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Link URL */}
            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.linkUrl')}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder={t('form.linkUrlPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Brand Color */}
            <FormField
              control={form.control}
              name="brand_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.brandColor')}</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading || isUploadingImage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bid Amount */}
            <FormField
              control={form.control}
              name="bid_eur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.bidAmount')}</FormLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                      €
                    </span>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                  <FormDescription className="text-xs">
                    {t('form.bidAmountHelp', { min: minBid.toFixed(2) })}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isUploadingImage}
            >
              {isUploadingImage
                ? t('form.uploadingImage')
                : isLoading
                ? t('form.submitting')
                : t('form.submit')}
            </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
