import { SKIP_LINK_TARGET_ID } from '@/constants/navigation.constants';
import { getContent } from '@/content/content.registry';
import type { SkipLinkProps } from './SkipLink.types';
import styles from './SkipLink.module.css';

/**
 * The first focusable element on every page, letting a keyboard or screen-reader
 * user jump past the navigation instead of tabbing through it on every route.
 */
export const SkipLink = ({
  targetId = SKIP_LINK_TARGET_ID,
}: SkipLinkProps): React.JSX.Element => (
  <a className={styles['link']} href={`#${targetId}`}>
    {getContent().common.skipToContent}
  </a>
);
