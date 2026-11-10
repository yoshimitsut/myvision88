import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeCameraScannerProps {
  onScan: (codigo: string) => void;
  ativo: boolean;
  setAtivo: (ativo: boolean) => void;
  ultimoCodigoLido?: string | null;
}

interface CameraDevice {
  id: string;
  label: string;
}

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({
  onScan,
  ativo,
  setAtivo,
}) => {
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [avisoSeguranca, setAvisoSeguranca] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cameraTraseira,] = useState(true);
  const [, setCamerasDisponiveis] = useState<CameraDevice[]>([]);
  const [cameraSelecionada, setCameraSelecionada] = useState<string>('');
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [suportaFlash, setSuportaFlash] = useState(false);
  const [feedbackLeitura, setFeedbackLeitura] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');

  // Mantém referência estável de onScan para evitar reinicializações da câmera
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const elementoId = 'baiten-barcode-camera-view';

  // Verifica se o contexto é seguro (HTTPS ou localhost)
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    const isSecure = window.isSecureContext || isLocalhost || isHttps;

    if (!isSecure) {
      setAvisoSeguranca(
        'Atenção: Navegadores mobile exigem conexão segura (HTTPS ou localhost) para abrir a câmera ao vivo.'
      );
    }
  }, []);

  // Busca lista de câmeras do dispositivo
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCamerasDisponiveis(devices);
        }
      })
      .catch((e) => {
        console.warn('Não foi possível listar câmeras antecipadamente:', e);
      });
  }, []);

  const pararCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Aviso ao parar câmera:', err);
      } finally {
        scannerRef.current = null;
        setFlashAtivo(false);
        setSuportaFlash(false);
      }
    }
  }, []);

  const processarCodigoLido = (decodedText: string) => {
    const now = Date.now();
    const cleanCode = decodedText.trim();

    const intervaloMinimo = cleanCode === lastCodeRef.current ? 2200 : 1200;
    if (now - lastScanTimeRef.current < intervaloMinimo) {
      return;
    }

    lastScanTimeRef.current = now;
    lastCodeRef.current = cleanCode;

    setFeedbackLeitura(cleanCode);
    setTimeout(() => setFeedbackLeitura(null), 1200);

    onScanRef.current(cleanCode);
  };

  // Função auxiliar para injetar Zoom Máximo/Desejado e Lanternas se suportado
  const aplicarConfiguracoesOtimizadasDoIphone = async (html5QrCodeInstance: Html5Qrcode) => {
    try {
      // 1. Tenta recuperar as capacidades físicas da câmera em execução
      const capabilities: any = html5QrCodeInstance.getRunningTrackCapabilities();

      const constraints: any = { advanced: [] };

      // 2. Aplica Zoom automático (entre 2.0x e 2.5x é o ideal para o iPhone focar de longe)
      if (capabilities && capabilities.zoom) {
        const zoomDesejado = 2.2;
        const maxZoomSuportado = capabilities.zoom.max || 1;
        const minZoomSuportado = capabilities.zoom.min || 1;

        // Garante que o zoom desejado está dentro do limite do aparelho
        const zoomFinal = Math.min(Math.max(zoomDesejado, minZoomSuportado), maxZoomSuportado);

        constraints.advanced.push({ zoom: zoomFinal });
      }

      if (constraints.advanced.length > 0) {
        await html5QrCodeInstance.applyVideoConstraints(constraints);
      }
    } catch (zoomError) {
      console.warn('Não foi possível aplicar o zoom automático:', zoomError);
    }
  };

  const iniciarCamera = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCarregando(true);
    setErroCamera(null);

    await pararCamera();

    try {
      const html5QrCode = new Html5Qrcode(elementoId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      // MODIFICAÇÃO 1: Configuração de resolução otimizada para capturar linhas finas de longe
      const scanConfig = {
        fps: 20, // Aumentado ligeiramente para respostas mais rápidas
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Caixa bem horizontalizada. Obriga o usuário a enquadrar reto e centralizado.
          const w = Math.floor(Math.min(viewfinderWidth * 0.90, 340));
          const h = Math.floor(Math.min(viewfinderHeight * 0.35, 120));
          return { width: Math.max(w, 220), height: Math.max(h, 80) };
        },
        // Forçar vídeo em Full HD (1080p) se disponível para não perder resolução ao afastar
        videoConstraints: {
          facingMode: cameraTraseira ? 'environment' : 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      };

      try {
        if (cameraSelecionada) {
          await html5QrCode.start(
            cameraSelecionada,
            { fps: scanConfig.fps, qrbox: scanConfig.qrbox }, // Se usar ID fixo, passa configurações diretas
            processarCodigoLido,
            () => { }
          );
        } else {
          await html5QrCode.start(
            { facingMode: cameraTraseira ? 'environment' : 'user' },
            scanConfig,
            processarCodigoLido,
            () => { }
          );
        }
      } catch (firstErr) {
        console.warn('Tentativa com constraints ideais falhou, tentando fallback...', firstErr);

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamerasDisponiveis(devices);
          const chosen = cameraTraseira ? devices[devices.length - 1] : devices[0];
          setCameraSelecionada(chosen.id);

          await html5QrCode.start(
            chosen.id,
            { fps: scanConfig.fps, qrbox: scanConfig.qrbox },
            processarCodigoLido,
            () => { }
          );
        }
      }

      // MODIFICAÇÃO 2: Executa injeção de zoom imediatamente após o sucesso do start
      await aplicarConfiguracoesOtimizadasDoIphone(html5QrCode);

      // Verifica suporte a lanterna (torch)
      try {
        const capabilities: any = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setSuportaFlash(true);
        }
      } catch {
        setSuportaFlash(false);
      }
    } catch (err: any) {
      console.error('Falha crítica ao abrir câmera:', err);
      let msg = err.message || 'Não foi possível acessar a câmera.';
      setErroCamera(msg);
      setAtivo(false);
    } finally {
      isStartingRef.current = false;
      setCarregando(false);
    }
  }, [cameraSelecionada, cameraTraseira, pararCamera, setAtivo]);

  useEffect(() => {
    if (ativo) {
      iniciarCamera();
    } else {
      pararCamera();
    }
    return () => { pararCamera(); };
  }, [ativo, iniciarCamera, pararCamera]);

  const alternarFlash = async () => {
    if (!scannerRef.current) return;
    try {
      const novoEstado = !flashAtivo;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: novoEstado } as any],
      });
      setFlashAtivo(novoEstado);
    } catch (e) {
      console.warn("Erro ao alternar flash:", e);
    }
  };

  return (
    <div>
      {avisoSeguranca && <p style={{ color: 'orange' }}>{avisoSeguranca}</p>}
      {erroCamera && <p style={{ color: 'red' }}>{erroCamera}</p>}
      {carregando && <p>Carregando câmera...</p>}

      {/* Texto de apoio visual crucial para o usuário de iPhone */}
      {ativo && (
        <p style={{ textAlign: 'center', fontSize: '14px', margin: '5px 0', color: '#666' }}>
          💡 Dica: Mantenha o celular a cerca de <b>20cm de distância</b> do produto.
        </p>
      )}

      <div id={elementoId} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }} />

      {suportaFlash && ativo && (
        <button onClick={alternarFlash} style={{ marginTop: '10px' }}>
          {flashAtivo ? 'Desativar Lanterna' : 'Ativar Lanterna'}
        </button>
      )}

      {feedbackLeitura && (
        <div style={{ background: 'green', color: 'white', padding: '10px', marginTop: '10px' }}>
          Lido com sucesso: {feedbackLeitura}
        </div>
      )}
    </div>
  );
};
