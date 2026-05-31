import 'package:flutter/material.dart';
import 'link_resolver.dart';
void main() {
  runApp(const IdesussApp());
}

class IdesussApp extends StatelessWidget {
  const IdesussApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Idesüss',
      theme: ThemeData.dark(),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void openPage(BuildContext context, Widget page) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF101010),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.play_circle_fill, size: 110, color: Colors.blue),
              const SizedBox(height: 24),
              const Text(
                'IDESÜSS',
                style: TextStyle(
                  fontSize: 42,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Watch Without Login',
                style: TextStyle(fontSize: 18, color: Colors.white70),
              ),
              const SizedBox(height: 45),

              MenuButton(
                label: 'Player',
                icon: Icons.movie,
                onPressed: () => openPage(context, PlayerScreen()),
              ),
              MenuButton(
                label: 'Radio',
                icon: Icons.radio,
                onPressed: () => openPage(context, RadioScreen()),
              ),
              MenuButton(
                label: 'Drive',
                icon: Icons.local_shipping,
                onPressed: () => openPage(context,DriveScreen()),
              ),
              MenuButton(
                label: 'Settings',
                icon: Icons.settings,
                onPressed: () => openPage(context, SettingsScreen()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MenuButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const MenuButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: SizedBox(
        width: 260,
        height: 52,
        child: ElevatedButton.icon(
          onPressed: onPressed,
          icon: Icon(icon),
          label: Text(label, style: const TextStyle(fontSize: 18)),
        ),
      ),
    );
  }
}

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({super.key});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  final TextEditingController _linkController = TextEditingController();

  IdesussResolvedLink? _resolvedLink;

  void _analyzeLink() {
    final result = cleanVideoUrl(_linkController.text);

    setState(() {
      _resolvedLink = result;
    });
  }

  void _clearLink() {
    _linkController.clear();

    setState(() {
      _resolvedLink = null;
    });
  }

  @override
  void dispose() {
    _linkController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final result = _resolvedLink;

    return Scaffold(
      backgroundColor: const Color(0xFF101010),
      appBar: AppBar(
        title: const Text('Idesüss Player'),
        backgroundColor: const Color(0xFF181818),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 24),

            const Icon(
              Icons.movie,
              size: 90,
              color: Colors.blue,
            ),

            const SizedBox(height: 20),

            const Text(
              'Idesüss Player',
              style: TextStyle(
                fontSize: 30,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            const Text(
              'Link beillesztése → videó lejátszás → teljes képernyő',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white70,
                fontSize: 16,
              ),
            ),

            const SizedBox(height: 32),

            TextField(
              controller: _linkController,
              minLines: 1,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Videó link',
                hintText: 'https://...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: _clearLink,
                ),
              ),
            ),

            const SizedBox(height: 18),

            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      // Clipboard bekötés később jön.
                    },
                    icon: const Icon(Icons.content_paste),
                    label: const Text('Beillesztés'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _clearLink,
                    icon: const Icon(Icons.cleaning_services),
                    label: const Text('Törlés'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _analyzeLink,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Lejátszás'),
              ),
            ),

            const SizedBox(height: 28),

            if (result != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFF181818),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      result.ok ? 'Link felismerve' : 'Hibás link',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: result.ok ? Colors.greenAccent : Colors.redAccent,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text('Platform: ${result.platform}'),
                    const SizedBox(height: 8),
                    Text('Tisztított link: ${result.cleanUrl}'),
                    const SizedBox(height: 8),
                    Text('Változott: ${result.changed ? "igen" : "nem"}'),
                    if (result.error != null) ...[
                      const SizedBox(height: 8),
                      Text('Hiba: ${result.error}'),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class RadioScreen extends StatelessWidget {
  const RadioScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const BasicScreen(
      title: 'Idesüss Radio',
      subtitle: 'Rádió modul később',
      icon: Icons.radio,
    );
  }
}

class DriveScreen extends StatelessWidget {
  const DriveScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const BasicScreen(
      title: 'Idesüss Drive',
      subtitle: 'Sofőrsegéd modul később',
      icon: Icons.local_shipping,
    );
  }
}

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const BasicScreen(
      title: 'Settings',
      subtitle: 'Beállítások később',
      icon: Icons.settings,
    );
  }
}

class BasicScreen extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;

  const BasicScreen({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF101010),
      appBar: AppBar(
        title: Text(title),
        backgroundColor: const Color(0xFF181818),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 100, color: Colors.blue),
              const SizedBox(height: 24),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 17, color: Colors.white70),
              ),
            ],
          ),
        ),
      ),
    );
  }
}