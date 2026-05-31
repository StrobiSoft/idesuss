class IdesussResolvedLink {
  final bool ok;
  final String originalUrl;
  final String cleanUrl;
  final String platform;
  final bool changed;
  final String? error;

  const IdesussResolvedLink({
    required this.ok,
    required this.originalUrl,
    required this.cleanUrl,
    required this.platform,
    required this.changed,
    this.error,
  });
}

IdesussResolvedLink cleanVideoUrl(String? inputUrl) {
  if (inputUrl == null || inputUrl.trim().isEmpty) {
    return const IdesussResolvedLink(
      ok: false,
      error: 'EMPTY_URL',
      originalUrl: '',
      cleanUrl: '',
      platform: 'unknown',
      changed: false,
    );
  }

  final originalUrl = inputUrl.trim();

  try {
    final uri = Uri.parse(originalUrl);
    final platform = detectVideoPlatform(uri);

    if (platform == 'tiktok') {
      return buildCleanResult(
        originalUrl,
        '${uri.origin}${uri.path}',
        platform,
      );
    }

    if (platform == 'youtube') {
      final videoId = uri.queryParameters['v'];
      final listId = uri.queryParameters['list'];

      if (uri.host.contains('youtu.be')) {
        return buildCleanResult(
          originalUrl,
          'https://youtu.be${uri.path}',
          platform,
        );
      }

      if (videoId != null && listId != null) {
        return buildCleanResult(
          originalUrl,
          'https://www.youtube.com/watch?v=$videoId&list=$listId',
          platform,
        );
      }

      if (videoId != null) {
        return buildCleanResult(
          originalUrl,
          'https://www.youtube.com/watch?v=$videoId',
          platform,
        );
      }

      return buildCleanResult(
        originalUrl,
        '${uri.origin}${uri.path}',
        platform,
      );
    }

    if (platform == 'facebook' || platform == 'instagram') {
      return buildCleanResult(
        originalUrl,
        '${uri.origin}${uri.path}',
        platform,
      );
    }

    final cleanedUri = stripKnownTrackingParams(uri);

    return buildCleanResult(
      originalUrl,
      cleanedUri.toString(),
      platform,
    );
  } catch (_) {
    return IdesussResolvedLink(
      ok: false,
      error: 'INVALID_URL',
      originalUrl: originalUrl,
      cleanUrl: originalUrl,
      platform: 'unknown',
      changed: false,
    );
  }
}

String detectVideoPlatform(Uri uri) {
  final host = uri.host.replaceFirst(RegExp(r'^www\.'), '').toLowerCase();

  if (host.contains('tiktok.com')) return 'tiktok';

  if (host.contains('youtube.com') || host.contains('youtu.be')) {
    return 'youtube';
  }

  if (host.contains('facebook.com') || host.contains('fb.watch')) {
    return 'facebook';
  }

  if (host.contains('instagram.com')) return 'instagram';

  if (host.contains('x.com') || host.contains('twitter.com')) {
    return 'x';
  }

  return 'unknown';
}

Uri stripKnownTrackingParams(Uri uri) {
  final trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'igshid',
    'si',
    'feature',
    'share',
    'share_app_id',
    'share_item_id',
    'share_link_id',
    'timestamp',
    'tt_from',
    'u_code',
    '_r',
    '_d',
    'preview_pb',
    'sharer_language',
    'enable_checksum',
    'source',
    'social_share_type',
    'ug_btm',
    'link_reflow_popup_iteration_sharer',
    'sp_root_share_link_id',
    'sp_root_d',
    'sp_level',
    'sp_root_u',
    'user_id',
    'sec_user_id',
  ];

  final cleanedParams = Map<String, String>.from(uri.queryParameters);

  for (final param in trackingParams) {
    cleanedParams.remove(param);
  }

  return uri.replace(queryParameters: cleanedParams.isEmpty ? null : cleanedParams);
}

IdesussResolvedLink buildCleanResult(
  String originalUrl,
  String cleanUrl,
  String platform,
) {
  return IdesussResolvedLink(
    ok: true,
    originalUrl: originalUrl,
    cleanUrl: cleanUrl,
    platform: platform,
    changed: originalUrl != cleanUrl,
  );
}